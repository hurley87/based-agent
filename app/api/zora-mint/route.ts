import { createCollectorClient } from "@zoralabs/protocol-sdk";
import { createPublicClient, createWalletClient, Hex, http } from "viem";
import { zora } from "viem/chains";
import { PublicClient } from 'viem'
import { privateKeyToAccount } from "viem/accounts";

const chain = zora;
const providerUrl = "https://rpc.zora.energy";

const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}` as Hex);

const publicClient = createPublicClient({
    chain,
    transport: http(providerUrl),
}) as PublicClient;
  
const walletClient = createWalletClient({
    account,
    chain,
    transport: http(providerUrl),
});

export async function POST() {
    const chainId = 7777777;
    const collectorClient = createCollectorClient({ chainId, publicClient });

    const { parameters } = await collectorClient.mint({
        tokenContract: "0x9c99dda14ffb2e6749a6c0abbe68bfdf578b757a",
        mintType: "1155", 
        tokenId: BigInt(17), 
        quantityToMint: 1,
        mintComment: "111 $enjoy",
        mintReferral: "0xbD78783a26252bAf756e22f0DE764dfDcDa7733c",
        minterAccount: account.address,
    });

    const transaction = await walletClient.writeContract({
        ...parameters,
        account
    });

    // Return the transaction hash and link
    return Response.json(
    {
        transaction
    },
    { status: 200 }
    );
}

export const dynamic = "force-dynamic";
export const maxDuration = 30;
  