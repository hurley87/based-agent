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

interface FarcasterReply {
  text: string;
  author: {
    verified_addresses: {
      eth_addresses: string[];
    };
  };
}

interface ConversationResponse {
  conversation: {
    cast: {
      direct_replies: FarcasterReply[];
    };
    next?: {
      cursor?: string;
    };
  };
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
    model: "gpt-4o",
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
    You are an AI hosting a game and the secret word is "${targetWord}".
    
    STRICT RESPONSE RULES:
    1. ONLY respond with "Yes" or "No" to questions unless they win
    2. NEVER provide hints or additional information
    
    WINNING CONDITION:
    - The player must EXPLICITLY include "${targetWord}" in their question
    - When they do:
      a. Transfer ${rewardAmount} $BASED token (0x32E0f9d26D1e33625742A52620cC76C1130efde6) to their wallet
      b. Respond: "Correct! You've won ${rewardAmount} $BASED tokens!"
    
    HANDLING GUESSES:
    1. If they make any other direct word guess → respond "No"
    2. If they include "${targetWord}" in their question but don't explicitly ask if it's the word → respond "No"
    
    REMEMBER: Keep ALL responses extremely concise. Only deviate from "Yes"/"No" when they win.
  `;

  const agent = createReactAgent({
    llm,
    tools,
    stateModifier: gameRules,
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
 * @param cursor - The cursor to fetch the next page of replies
 * @returns Array of direct reply texts from the conversation
 */
async function getFarcasterReplies(threadId: string, apiKey: string, cursor: string): Promise<{ text: string, author: string }[]> {
  const url = new URL('https://api.neynar.com/v2/farcaster/cast/conversation');
  url.searchParams.set('identifier', threadId);
  url.searchParams.set('type', 'hash');
  url.searchParams.set('reply_depth', '1');
  url.searchParams.set('include_chronological_parent_casts', 'true');
  url.searchParams.set('limit', '50');
  
  if (cursor) {
    url.searchParams.set('cursor', cursor);
  }

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

  const data = await response.json() as ConversationResponse;
  
  // Handle case where conversation doesn't exist or is empty
  if (!data.conversation?.cast?.direct_replies) {
    return [];
  }

  const currentReplies = data.conversation.cast.direct_replies.map((reply) => ({
    text: reply.text,
    author: reply.author.verified_addresses?.eth_addresses?.[0] ?? '',
  }));

  // Check if there are more replies to fetch
  const nextCursor = data.conversation.next?.cursor;
  if (nextCursor) {
    const nextReplies = await getFarcasterReplies(threadId, apiKey, nextCursor);
    return [...currentReplies, ...nextReplies];
  }

  return currentReplies;
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
  const rewardAmount = "1000000";

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
      process.env.NEYNAR_API_KEY || '',
      ''
    );
    console.log("directReplies", directReplies);

    const containsTargetWordTwoTimes = directReplies.filter(reply => reply.text.toLowerCase().includes(targetWord.toLowerCase())).length >= 2;
    console.log("containsTargetWordTwoTimes", containsTargetWordTwoTimes);

    // count how many times the author of the direct replies is the same as the user
    const authorCount = directReplies.filter(reply => reply.author.toLowerCase() === userWalletAddress.toLowerCase()).length;
    console.log("authorCount", authorCount);

    const userHasGuessedTooManyTimes = authorCount >= 20;
    console.log("userHasGuessedTooManyTimes", userHasGuessedTooManyTimes);

    if (userHasGuessedTooManyTimes) {
      await sendFarcasterMessage('You have guessed too many times, you lose.', replyTo);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (containsTargetWordTwoTimes) {
      await sendFarcasterMessage('Correct but someone else already won.', replyTo);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const message = `
    CONVERSATION HISTORY:
    ${directReplies.join('\n')}
    
    CURRENT INTERACTION:
    User's question: "${userInput}"
    User's wallet address: "${userWalletAddress}"
    User's guess count: ${authorCount}
    
    STRICT RESPONSE RULES:
    1. For Yes/No responses, format as "Yes (X guesses remaining)" or "No (X guesses remaining)" where X is (20 - guess count)
    2. NEVER provide hints or additional information
    3. Answer TRUTHFULLY about properties of the word "${targetWord}"
    
    WINNING CONDITION:
    - The player must EXPLICITLY include "${targetWord}" in their question
    - When they do:
      a. Transfer ${rewardAmount} $BASED token (0x32E0f9d26D1e33625742A52620cC76C1130efde6) to their wallet
      b. Respond: "Correct! You've won ${rewardAmount} $BASED tokens!"
    
    HANDLING GUESSES:
    1. If they ask about properties of "${targetWord}" → answer truthfully with "Yes (X guesses remaining)" or "No (X guesses remaining)"
    2. If they make any direct word guess (without being "${targetWord}") → respond "No (X guesses remaining)"
    3. If they include "${targetWord}" in their question but don't explicitly ask if it's the word → respond "No (X guesses remaining)"
    4. They can only guess 20 times, if they guess more than 20 times, respond "You've guessed too many times, you lose."
    5. Always include remaining guesses in the format "(X guesses remaining)" unless they win or lose

    REMEMBER: 
    - Keep ALL responses extremely concise
    - Only deviate from "Yes/No (X guesses remaining)" format when they win or lose
    - Answer truthfully about ALL properties of the word "${targetWord}"`;

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