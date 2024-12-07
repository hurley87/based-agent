import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

export async function POST() {
    const { OPENAI_API_KEY } = process.env;

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