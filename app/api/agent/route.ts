import { Coinbase, Transfer, Wallet } from "@coinbase/coinbase-sdk";

export async function POST(request: Request) {
  const { API_KEY_NAME, API_KEY_PRIVATE_KEY, WALLET_ID, WALLET_SEED } = process.env;

  // Check if the environment variables are set
  if (!API_KEY_NAME || !API_KEY_PRIVATE_KEY) {
    return Response.json(
      { message: "Environment variables are not set" },
      { status: 500 }
    );
  }

  const body = await request.json();

  // Check if the address is provided
  if (!body?.address) {
    return Response.json({ message: "Address is required" }, { status: 400 });
  }

  // Create a new Coinbase instance
 new Coinbase({
    apiKeyName: API_KEY_NAME as string,
    privateKey: API_KEY_PRIVATE_KEY.replaceAll("\\n", "\n") as string,
  });

  // get the random wallet id
  const walletId = WALLET_ID as string;

  // Get the seed of the wallet
  const seed = WALLET_SEED as string;

  // Import the wallet
  const userWallet = await Wallet.import({ seed, walletId });

  // Create a transfer to the destination address
  let transfer: Transfer;
  try {
    transfer = await userWallet?.createTransfer({
      amount: 0.00000001,
      assetId: "eth",
      destination: body.address,
    });

    await transfer.wait();
  } catch (e) {
    console.error(e);
    return Response.json(
      { message: "Failed to create transfer" },
      { status: 500 }
    );
  }

  // Return the transaction hash and link
  return Response.json(
    {
      transactionHash: transfer?.getTransactionHash()?.substring(0, 10),
      transactionLink: transfer?.getTransactionLink(),
    },
    { status: 200 }
  );
}

export const dynamic = "force-dynamic";
export const maxDuration = 30;