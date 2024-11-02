import { decodeEventLog, parseAbi } from "viem";

export async function POST(request: Request) {
  const req = await request.json();
  console.log("req", req);
  // Return the transaction hash and link

  const data = decodeEventLog({
    abi: parseAbi(['event Transfer(address indexed, address, uint256)']), 
    // `data` should be 64 bytes, but is only 32 bytes.
    data: '0x0000000000000000000000000000000000000000000000000000000000000001', 
    topics: [
      '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
      '0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266',
    ]
  })

  console.log("data", data);
  
  return Response.json({ gm: "GM" });
}

export const dynamic = "force-dynamic";