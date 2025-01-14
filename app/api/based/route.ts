import { decodeEventLog } from "viem";

export async function POST(request: Request) {
  const req = await request.json();
  console.log("req", req);

  return Response.json({ gm: "GM" });
}

export const dynamic = "force-dynamic";