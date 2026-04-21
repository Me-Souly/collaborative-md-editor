import { API_URL } from '@http';
import { getToken } from '@utils/tokenStorage';
import { getCsrfToken } from '@utils/csrfToken';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };
export type InlineAction = 'improve' | 'fix' | 'expand' | 'translate' | 'continue' | 'summarize';

function buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const csrf = getCsrfToken();
    if (csrf) headers['x-csrf-token'] = csrf;
    return headers;
}

/**
 * Streams AI chat response token-by-token.
 * Yields each text chunk as it arrives.
 */
export async function* chatStream(
    messages: ChatMessage[],
    noteContent?: string,
    signal?: AbortSignal,
): AsyncGenerator<string> {
    const res = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: buildHeaders(),
        credentials: 'include',
        signal,
        body: JSON.stringify({ messages, noteContent }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'AI request failed' }));
        throw new Error(err.message || 'AI request failed');
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') return;
            try {
                const chunk = JSON.parse(data);
                if (typeof chunk === 'string') yield chunk;
                if (chunk?.error) throw new Error(chunk.error);
            } catch {
                // non-JSON chunk — skip
            }
        }
    }
}

/**
 * One-shot inline AI action.
 */
export async function inlineAction(
    action: InlineAction,
    text: string,
    noteContent?: string,
): Promise<string> {
    const res = await fetch(`${API_URL}/ai/inline`, {
        method: 'POST',
        headers: buildHeaders(),
        credentials: 'include',
        body: JSON.stringify({ action, text, noteContent }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'AI request failed' }));
        throw new Error(err.message || 'AI request failed');
    }

    const data = await res.json();
    return data.result ?? '';
}
