import { CdpAgentkit } from "@coinbase/cdp-agentkit-core";
import { HumanMessage } from "@langchain/core/messages";
import { CdpToolkit } from "@coinbase/cdp-langchain";
import { NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";

// Environment variable schema
const envSchema = z.object({
  API_KEY_NAME: z.string(),
  API_KEY_PRIVATE_KEY: z.string(),
  WALLET_DATA: z.string(),
  NETWORK_ID: z.string(),
  OPENAI_API_KEY: z.string(),
});

// Game configuration type
interface GameConfig {
  threadId: string;
  targetWord: string;
  rewardAmount: string;
}

// Agent configuration type
interface AgentConfig {
  cdpWalletData: string;
  networkId: string;
  cdpApiKeyName: string;
  cdpApiKeyPrivateKey: string;
  source: string;
  sourceVersion: string;
}

/**
 * Initializes the game agent with the specified configuration
 */
async function initializeGameAgent({
  cdpApiKeyName,
  cdpWalletData,
  cdpApiKeyPrivateKey,
  targetWord,
  rewardAmount,
  networkId,
  apiKey,
  threadId,
}: {
  cdpApiKeyName: string;
  cdpWalletData: string;
  cdpApiKeyPrivateKey: string;
  targetWord: string;
  rewardAmount: string;
  networkId: string;
  apiKey: string;
  threadId: string;
}) {

  const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
    apiKey,
  });

  const agentConfig: AgentConfig = {
    cdpWalletData,
    networkId,
    cdpApiKeyName,
    cdpApiKeyPrivateKey,
    source: 'agentkit-core',
    sourceVersion: '0.0.1',
  };

  const agentkit = await CdpAgentkit.configureWithWallet(agentConfig);
  const cdpToolkit = new CdpToolkit(agentkit);
  const tools = cdpToolkit.getTools();

  const gameRules = `
    You are hosting a game of Twenty Questions. The word is "${targetWord}".
    
    Rules:
    1. Users can ask up to 20 yes/no questions about the word
    2. You must answer only with "Yes" or "No", followed by nothing else
    3. If the user includes "${targetWord}" in their question, and the word is "${targetWord}":
       - Congratulate them enthusiastically
       - Transfer ${rewardAmount} 0x32E0f9d26D1e33625742A52620cC76C1130efde6 token to their wallet
       - End the game
    4. If they make any other direct guess, just respond with "No"
    
    Keep your responses extremely concise - just "Yes" or "No" unless they win.
  `;

  const agent = createReactAgent({
    llm,
    tools,
    messageModifier: gameRules,
  });

  return {
    agent,
    config: { configurable: { thread_id: threadId } },
    llm,
  };
}

/**
 * Fetches direct replies from a Farcaster conversation thread
 * @param threadId - The hash identifier of the Farcaster thread
 * @param apiKey - The Neynar API key
 * @returns Array of direct reply texts from the conversation
 */
async function getFarcasterReplies(threadId: string, apiKey: string): Promise<string[]> {
  const url = new URL('https://api.neynar.com/v2/farcaster/cast/conversation');
  url.searchParams.set('identifier', threadId);
  url.searchParams.set('type', 'hash');
  url.searchParams.set('reply_depth', '2');
  url.searchParams.set('include_chronological_parent_casts', 'false');
  url.searchParams.set('limit', '20');

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'x-api-key': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Farcaster replies: ${response.statusText}`);
  }

  const { conversation } = await response.json();
  return conversation.cast.direct_replies.map((reply: { text: string }) => reply.text);
}


/**
 * Sends a message to a Farcaster conversation thread
 * @param text - The message to send
 * @param replyTo - The hash identifier of the Farcaster thread
 * @returns The response from the Farcaster API
 */
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

/**
 * POST handler for the game endpoint
 */
export async function POST(request: Request) {
  const { data } = await request.json();
  console.log("data", data);

  const userInput = data.text;
  const userWalletAddress = data.author.verified_addresses?.eth_addresses?.[0];
  const replyTo = data.hash;

  console.log("userInput", userInput);
  console.log("userWalletAddress", userWalletAddress);

  if(!userWalletAddress) {
    await sendFarcasterMessage("You'll need a wallet to play.", replyTo);
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const threadId = data.thread_hash;
  console.log("threadId", threadId);
  const targetWord = process.env.SECRET_WORD as string;
  const rewardAmount = "1";

  try {

    // Validate environment variables
    const env = envSchema.parse(process.env);

    // Game configuration
    const gameConfig: GameConfig = {
      threadId,
      targetWord,
      rewardAmount
    };

    console.log("networkId", env.NETWORK_ID);

    const { agent, config } = await initializeGameAgent({
      cdpApiKeyName: env.API_KEY_NAME,
      cdpWalletData: env.WALLET_DATA,
      cdpApiKeyPrivateKey: env.API_KEY_PRIVATE_KEY,
      targetWord: gameConfig.targetWord,
      rewardAmount: gameConfig.rewardAmount,
      networkId: env.NETWORK_ID,
      apiKey: env.OPENAI_API_KEY,
      threadId: gameConfig.threadId,
    });

    const directReplies = await getFarcasterReplies(
      threadId, 
      process.env.NEYNAR_API_KEY || ''
    );
    console.log("directReplies", directReplies);

    // check if the direct replies contain the target word in two replies
    const containsTargetWordTwoTimes = directReplies.filter(reply => reply.includes(targetWord)).length >= 2;
    console.log("containsTargetWordTwoTimes", containsTargetWordTwoTimes);

    if (containsTargetWordTwoTimes) {
      console.log("User won!!!!!!!");
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const message = `${directReplies.join('\n')}User's question: "${userInput}"
    User's wallet address: "${userWalletAddress}"
    
    Remember:
    1. If their question contains "${targetWord}", transfer ${rewardAmount} 0x32E0f9d26D1e33625742A52620cC76C1130efde6 token to their wallet, this is called the $BASED token
    2. Otherwise, just answer "Yes" or "No" with no additional text`;

    const stream = await agent.stream({ messages: [new HumanMessage(message)] }, config);

    let agentResponse = "";
    for await (const chunk of stream) {
      if ("agent" in chunk) {
        agentResponse = chunk.agent.messages[0].content;
      } else if ("tools" in chunk) {
        console.log(chunk.tools.messages[0].content);
      }
    }

    console.log("agentResponse", agentResponse);

    await sendFarcasterMessage(agentResponse, replyTo);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Game initialization error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Missing or invalid environment variables" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to initialize game" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";