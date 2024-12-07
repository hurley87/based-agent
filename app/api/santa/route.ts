// import { createOpenAI } from '@ai-sdk/openai';
// import { generateText } from 'ai';
import { BASED_SANTA_ADDRESS, BASED_SANTA_ABI } from './basedSanta';
import { baseSepolia } from 'viem/chains';
import { 
    createWalletClient,
    // createWalletClient, 
    http } from 'viem';
import { createPublicClient } from 'viem';
// import { NeynarAPIClient } from '@neynar/nodejs-sdk';
import { privateKeyToAccount } from 'viem/accounts';

const RPC_URL = 'https://sepolia.base.org';
// const neynarClient = new NeynarAPIClient({
//     apiKey: process.env.NEYNAR_API_KEY as string
// });


const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
});
  
const walletClient = createWalletClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
});


export async function POST(request: Request) {
    const req = await request.json();
    // const { OPENAI_API_KEY } = process.env;
    // const castText = req.data.text;
    const verifiedAddresses = req.data.author.verified_addresses;
    const verifiedAddress =
      verifiedAddresses?.eth_addresses?.[0] ||
      ('0xbD78783a26252bAf756e22f0DE764dfDcDa7733c' as `0x${string}`);

    console.log('verifiedAddress', verifiedAddress);

    if(!verifiedAddress) {
        console.log('prompt user they dont have a verified address')
        return Response.json(
            {
                text: 'You are not verified'
            },
            { status: 200 }
        );
    }

    // get present count
    // prompt if not more presents
    const presentCountBigInt = (await publicClient.readContract({
        abi: BASED_SANTA_ABI,
        address: BASED_SANTA_ADDRESS,
        functionName: 'getUnsentPresentsCount',
      })) as bigint;

    console.log('presentCount', presentCountBigInt);
    const presentCount = Number(presentCountBigInt);
    console.log('presentCount', presentCount);

    if(presentCount === 0) {
        console.log('prompt user no more presents')
        return Response.json(
            {
                text: 'No more presents'
            },
            { status: 200 }
        );
    }

    // check if verifiedAddress has received a present or not
    // prompt that they have received a present
    const hasReceivedPresent = (await publicClient.readContract({
        abi: BASED_SANTA_ABI,
        address: BASED_SANTA_ADDRESS,
        functionName: 'hasReceivedPresent',
        args: [verifiedAddress],
      })) as boolean;

    console.log('hasReceivedPresent', hasReceivedPresent);

    if(!hasReceivedPresent) {
        console.log('prompt user they have received a present')
        return Response.json(
            {
                text: 'You have not received a present'
            },
            { status: 200 }
        );
    }

    // check that they have a balance of 1M Based (check BASED contract, balanceOf)
    // prompt that they have a balance of 1M Base

    // write to 

    // const openai = createOpenAI({
    //     baseURL: "https://api.openai.com/v1",
    //     apiKey: OPENAI_API_KEY,
    // });

    // const result = await generateText({
    // model: openai('gpt-4-turbo'),
    // messages: [
    //     {
    //     role: 'user',
    //     content: [
    //         { type: 'text', text: 'You are a JavaScript expert.' },
    //         {
    //         type: 'text',
    //         text: `Error message: 403`,
    //         },
    //         { type: 'text', text: 'Explain the error message.' },
    //     ],
    //     },
    // ],
    // });

    // const text = result.text;

    // console.log('text', text);

    // get present
    const present = await publicClient.readContract({
        abi: BASED_SANTA_ABI,
        address: BASED_SANTA_ADDRESS,
        functionName: 'getNextPresent',
        args: [],
    });

    console.log('present', present);

    const privateKey = process.env.SERVER_PRIVATE_KEY;
    const account = privateKeyToAccount(privateKey as `0x${string}`);
  
    // Add to allowlist
    const { request: EnjoyRequest }: any = await publicClient.simulateContract({
      account,
      address: BASED_SANTA_ADDRESS,
      abi: BASED_SANTA_ABI,
      functionName: 'sendNextPresent',
      args: [verifiedAddress]
    });
  
    const hash = await walletClient.writeContract(EnjoyRequest);
  
    console.log('hash', hash);
  
    const receipt = await publicClient?.waitForTransactionReceipt({ hash });
  
    console.log('receipt', receipt);

    return Response.json(
    {
        success: true,
    },
    { status: 200 }
    );
}

export const dynamic = "force-dynamic";
export const maxDuration = 30;