import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

export async function POST() {
    const { ANTHROPIC_API_KEY } = process.env;

    const anthropic = createAnthropic({
    baseURL: "https://api.anthropic.com/v1",
    apiKey: ANTHROPIC_API_KEY,
    });

    const result = await generateText({
    model: anthropic('claude-3-5-sonnet-20240620', {
        cacheControl: true,
    }),
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

    // Return the transaction hash and link
    return Response.json(
    {
        text
    },
    { status: 200 }
    );
}

export const dynamic = "force-dynamic";
export const maxDuration = 30;