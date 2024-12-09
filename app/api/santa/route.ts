import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { BASED_SANTA_ADDRESS, BASED_SANTA_ABI } from './basedSanta';
import { baseSepolia } from 'viem/chains';
import { erc20Abi, createWalletClient, http } from 'viem';
import { createPublicClient } from 'viem';
import { baseSantaPrompt } from './prompt';
import { privateKeyToAccount } from 'viem/accounts';

const RPC_URL = 'https://sepolia.base.org';


const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
});
  
const walletClient = createWalletClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
});

async function generateSantaResponse(text: string) {
    const { OPENAI_API_KEY } = process.env;
    
    const openai = createOpenAI({
        baseURL: "https://api.openai.com/v1",
        apiKey: OPENAI_API_KEY,
    });

    const result = await generateText({
        model: openai('gpt-4-turbo'),
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: baseSantaPrompt,
                    },
                    { type: 'text', text },
                ],
            },
        ],
    });

    return result.text;
}

export async function POST(request: Request) {
    const req = await request.json();
    const castText = req.data.text;
    const replyTo = req.data.hash;  
    const verifiedAddresses = req.data.author.verified_addresses;
    const verifiedAddress = verifiedAddresses?.eth_addresses?.[0];

    const isAskingForPresent = await generateSantaResponse(`User said: ${castText}. Return true if they are asking for a present, false otherwise.`);
    console.log('isAskingForPresent', isAskingForPresent);

    if(isAskingForPresent.toString().toLowerCase() === 'false') {
        const text = await generateSantaResponse(`User said: ${castText}. Answer they question as Based Santa and suggest they ask for a present. Just return one sentence of text. No quotes and dont tag any user.`);
        await sendFarcasterMessage(text, replyTo);
        return Response.json(
            {
                success: true
            },
            { status: 200 }
        );
    }

    if(!verifiedAddress) {
        console.log('prompt user they dont have a verified address')
        const text = await generateSantaResponse(`User said: ${castText} but they don't have a wallet. Answer they question as Based Santa and explain they need a wallet to receive a present. Just return one sentence of text. No quotes and dont tag any user. Don't say "Based Santa" or "Based" in the response and don't say hey there.`);
        await sendFarcasterMessage(text, replyTo);
        return Response.json(
            {
                success: true
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
        const text = await generateSantaResponse(`User said: "${castText}" but there are no more presents. Reply to the user as if you were Based Santa. Just return one sentence of text. No quotes and dont tag any user.`);
        await sendFarcasterMessage(text, replyTo);

        return Response.json(
            {
                success: true
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

    if(hasReceivedPresent) {
        console.log('prompt user they have received a present')
        const text = await generateSantaResponse(`User said: "${castText}" but they have received a present. Reply to the user as if you were Based Santa. Just return one sentence of text. No quotes and dont tag any user.`);
        await sendFarcasterMessage(text, replyTo);

        return Response.json(
            {
                success: true
            },
            { status: 200 }
        );
    }

    // check that they have a balance of 1M Based (check BASED contract, balanceOf)
    // prompt that they have a balance of 1M Base
    const balance = await publicClient.readContract({
        abi: erc20Abi,
        address: "0x32E0f9d26D1e33625742A52620cC76C1130efde6",
        functionName: 'balanceOf',
        args: [verifiedAddress],
    });

    console.log('balance', balance); 

    if(balance < 1000000000000000000) {
        console.log('prompt user they dont have a balance of 1M Based')
        const text = await generateSantaResponse(`User said: "${castText}" but they don't have a balance of 1M Based. Reply to the user as if you were Based Santa. Just return one sentence of text. No quotes and dont tag any user.`);
        await sendFarcasterMessage(text, replyTo);

        return Response.json(
            {
                success: true
            },
            { status: 200 }
        );
    }

    // get present
    const presentDescription = await publicClient.readContract({
        abi: BASED_SANTA_ABI,
        address: BASED_SANTA_ADDRESS,
        functionName: 'getNextPresentDescription',
        args: [],
    });

    console.log('presentDescription', presentDescription)

    const privateKey = process.env.SERVER_PRIVATE_KEY;
    const account = privateKeyToAccount(privateKey as `0x${string}`);
  
    // send present
    const { request: EnjoyRequest } = await publicClient.simulateContract({
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

    const text = await generateSantaResponse(`User said: "${castText}" and they have received a present. The present is ${presentDescription}. Reply to the user as if you were Based Santa. Just return one sentence of text. No quotes and dont tag any user.`);
    await sendFarcasterMessage(text, replyTo);

    return Response.json(
    {
        success: true,
    },
    { status: 200 }
    );
}

export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function sendFarcasterMessage(text: string, replyTo: string) {
  const uuid = process.env.SIGNER_UUID as string;
  const url = 'https://api.neynar.com/v2/farcaster/cast';
  const options = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'x-api-key': process.env.NEYNAR_API_KEY as string,
    },
    body: JSON.stringify({
      signer_uuid: uuid,
      text,
      parent: replyTo,
    })
  };

  try {
    const response = await fetch(url, options);
    const json = await response.json();
    console.log(json);
    return json;
  } catch (err) {
    console.error(err);
    throw err;
  }
}