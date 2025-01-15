import { CdpAgentkit } from "@coinbase/cdp-agentkit-core";
import { CdpToolkit } from "@coinbase/cdp-langchain";
import { Coinbase } from "@coinbase/coinbase-sdk";

export async function POST(request: Request) {
  const req = await request.json();
  console.log("req", req);
  const { API_KEY_NAME, API_KEY_PRIVATE_KEY } = process.env;

  if (!API_KEY_NAME || !API_KEY_PRIVATE_KEY) {
    return Response.json({ message: "Environment variables are not set" }, { status: 500 });
  }

  Coinbase.configure({
    apiKeyName: API_KEY_NAME as string,
    privateKey: API_KEY_PRIVATE_KEY.replaceAll("\\n", "\n") as string,
  });
  
  // Configure CDP AgentKit
  const config = {
    cdpWalletData: process.env.WALLET_DATA || undefined,
    networkId: process.env.NETWORK_ID || "base-sepolia",
  };

  console.log("config", config);

  // Initialize CDP AgentKit
  const agentkit = await CdpAgentkit.configureWithWallet(config);

  // Initialize CDP AgentKit Toolkit and get tools
  const cdpToolkit = new CdpToolkit(agentkit);
  const tools = cdpToolkit.getTools();

  console.log("tools", tools);

  return Response.json({ gm: "GM" });
}

export const dynamic = "force-dynamic";