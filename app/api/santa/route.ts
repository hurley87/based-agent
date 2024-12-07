// import { createOpenAI } from '@ai-sdk/openai';
// import { generateText } from 'ai';
import { BASED_SANTA_ADDRESS, BASED_SANTA_ABI } from './basedSanta';
import { baseSepolia } from 'viem/chains';
import { 
    // createWalletClient, 
    http } from 'viem';
import { createPublicClient } from 'viem';
const RPC_URL = 'https://sepolia.base.org';

const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
});
  
// const walletClient = createWalletClient({
//     chain: baseSepolia,
//     transport: http(RPC_URL),
// });


export async function POST(request: Request) {
    const req = await request.json();
    // const { OPENAI_API_KEY } = process.env;
    // const castText = req.data.text;
    const verifiedAddresses = req.data.author.verified_addresses;
    const verifiedAddress =
      verifiedAddresses?.eth_addresses?.[0] ||
      ('0xbD78783a26252bAf756e22f0DE764dfDcDa7733c' as `0x${string}`);

    if(!verifiedAddress) {
        return Response.json(
            {
                text: 'You are not verified'
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
        return Response.json(
            {
                text: 'You have not received a present'
            },
            { status: 200 }
        );
    }

    // check that they have a balance of 1M Based (check BASED contract, balanceOf)
    // prompt that they have a balance of 1M Base

    // get present count
    // prompt if not more presents

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

    return Response.json(
    {
        success: true,
    },
    { status: 200 }
    );
}

export const dynamic = "force-dynamic";
export const maxDuration = 30;