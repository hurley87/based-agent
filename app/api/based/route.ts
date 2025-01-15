import { CdpAgentkit } from "@coinbase/cdp-agentkit-core";
import { CdpToolkit } from "@coinbase/cdp-langchain";

export async function POST(request: Request) {
  const req = await request.json();
  console.log("req", req);
  const { API_KEY_NAME, API_KEY_PRIVATE_KEY } = process.env;

  if (!API_KEY_NAME || !API_KEY_PRIVATE_KEY) {
    return Response.json(
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

    // Initialize CDP AgentKit
    const agentkit = await CdpAgentkit.configureWithWallet(config);
    
    // Initialize CDP AgentKit Toolkit and get tools
    const cdpToolkit = new CdpToolkit(agentkit);
    const tools = cdpToolkit.getTools();

    return Response.json({ success: true, tools });
    
  } catch (error) {
    console.error('CDP configuration error:', error);
    return Response.json(
      { error: "Failed to configure CDP AgentKit" }, 
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";