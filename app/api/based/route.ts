import { CdpAgentkit } from "@coinbase/cdp-agentkit-core";
import { CdpToolkit } from "@coinbase/cdp-langchain";
import { NextResponse } from "next/server";

// Handle POST requests
export async function POST(request: Request) {
  const req = await request.json();
  console.log("req", req);
  const { API_KEY_NAME, API_KEY_PRIVATE_KEY } = process.env;

  if (!API_KEY_NAME || !API_KEY_PRIVATE_KEY) {
    return NextResponse.json(
      { error: "CDP API credentials are not configured" },
      { status: 500 }
    );
  }

  try {
    // Configure CDP AgentKit
    const config = {
      cdpWalletData: process.env.WALLET_DATA,
      networkId: process.env.NETWORK_ID || "base-sepolia",
      coinbase: {
        apiKeyName: API_KEY_NAME,
        privateKey: API_KEY_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }
    };

    const agentkit = await CdpAgentkit.configureWithWallet(config);
    const cdpToolkit = new CdpToolkit(agentkit);
    const tools = cdpToolkit.getTools();

    return NextResponse.json({ success: true, tools });
    
  } catch (error) {
    console.error('CDP configuration error:', error);
    return NextResponse.json(
      { error: "Failed to configure CDP AgentKit" },
      { status: 500 }
    );
  }
}

// Handle GET requests
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}

export const dynamic = "force-dynamic";