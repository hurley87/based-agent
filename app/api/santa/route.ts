import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

export async function POST(request: Request) {
    const req = await request.json();
    console.log('req', req);

    const { OPENAI_API_KEY } = process.env;

    const castText = req.data.text;
    console.log('castText', castText);
    const verifiedAddresses = req.data.author.verified_addresses;
    console.log('verifiedAddresses', verifiedAddresses);
    const verifiedAddress =
      verifiedAddresses?.eth_addresses?.[0] ||
      ('0xbD78783a26252bAf756e22f0DE764dfDcDa7733c' as `0x${string}`);
    console.log('verifiedAddress', verifiedAddress);

    if(!verifiedAddress) {
        return Response.json(
            {
                text: 'You are not verified'
            },
            { status: 200 }
        );
    }

    // check if verifiedAddress has received a present or not
    // prompt that they have received a present

    // check that they have a balance of 1M Based
    // prompt that they have a balance of 1M Base

    // get present count
    // prompt if not more presents

    // write to 

    const openai = createOpenAI({
        baseURL: "https://api.openai.com/v1",
        apiKey: OPENAI_API_KEY,
    });

    const result = await generateText({
    model: openai('gpt-4-turbo'),
    messages: [
        {
        role: 'user',
        content: [
            { type: 'text', text: 'You are a JavaScript expert.' },
            {
            type: 'text',
            text: `Error message: 403`,
            },
            { type: 'text', text: 'Explain the error message.' },
        ],
        },
    ],
    });

    const text = result.text;

    console.log('text', text);

    return Response.json(
    {
        text
    },
    { status: 200 }
    );
}

export const dynamic = "force-dynamic";
export const maxDuration = 30;