export async function POST(request: Request) {
  const req = await request.json();
  console.log("req", req);
  // Return the transaction hash and link
  return Response.json({ gm: "GM" });
}

export const dynamic = "force-dynamic";