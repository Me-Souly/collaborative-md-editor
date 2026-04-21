import OpenAI from 'openai';

const groq = new OpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY,
});

const CHAT_MODEL = process.env.GROQ_CHAT_MODEL || 'llama-3.3-70b-versatile';
const INLINE_MODEL = process.env.GROQ_INLINE_MODEL || 'llama-3.1-8b-instant';

const INLINE_PROMPTS = {
    improve: 'Rewrite the following text to be clearer, more concise, and better structured. Return only the rewritten text, no explanations.',
    fix: 'Fix all grammar, spelling, and punctuation errors in the following text. Return only the corrected text, no explanations.',
    expand: 'Expand the following text with more detail, examples, or context. Return only the expanded text, no explanations.',
    translate: 'Detect the language of the following text. If it is in English, translate it to Russian. If it is in Russian, translate it to English. If it is in another language, translate it to English. Return only the translated text, no explanations.',
    continue: 'Continue writing naturally after the following text. Return only the continuation (not the original text), no explanations.',
    summarize: 'Summarize the following text concisely, capturing the key points. Return only the summary, no explanations.',
};

/**
 * Stream chat messages to the client via SSE.
 * Calls the callback on each text delta, and resolves when done.
 */
export async function streamChat({ messages, system, onChunk, signal }) {
    const systemMessage = system
        ? [{ role: 'system', content: system }]
        : [];

    const stream = await groq.chat.completions.create({
        model: CHAT_MODEL,
        messages: [...systemMessage, ...messages],
        stream: true,
        max_tokens: 2048,
    }, { signal });

    for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) onChunk(delta);
    }
}

/**
 * One-shot inline operation.
 */
export async function completeInline({ action, text, noteContent }) {
    const promptInstruction = INLINE_PROMPTS[action];
    if (!promptInstruction) throw new Error(`Unknown inline action: ${action}`);

    const userMessage = action === 'summarize' && noteContent
        ? noteContent
        : text;

    const completion = await groq.chat.completions.create({
        model: INLINE_MODEL,
        messages: [
            { role: 'system', content: promptInstruction },
            { role: 'user', content: userMessage },
        ],
        max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content?.trim() ?? '';
}
