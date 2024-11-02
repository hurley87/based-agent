import { decodeEventLog } from "viem";
import { abi } from "@/utils/abi";

export async function POST(request: Request) {
  const req = await request.json();
  console.log("req", req);

  const comments = req.comments;

  comments.forEach((comment: { data: `0x${string}`; topics: [] | [signature: `0x${string}`, ...args: `0x${string}`[]] }) => {
    const data = comment.data;
    const topics = comment.topics;
    // Return the transaction hash and link

    const decoded = decodeEventLog({
        abi,
        data,
        topics,
      });

    console.log("decoded", decoded);
  });

  return Response.json({ gm: "GM" });
}

export const dynamic = "force-dynamic";