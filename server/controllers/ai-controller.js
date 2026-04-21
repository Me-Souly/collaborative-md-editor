import { streamChat, completeInline } from '../services/ai-service.js';

class AiController {
    /**
     * POST /api/ai/chat
     * Body: { messages: [{role, content}][], noteContent?: string }
     * Response: SSE stream of text chunks
     */
    async chat(req, res) {
        const { messages, noteContent } = req.body;

        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ message: 'messages array is required' });
        }

        if (!process.env.GROQ_API_KEY) {
            return res.status(503).json({ message: 'AI service is not configured' });
        }

        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        const system = noteContent
            ? `You are a helpful AI assistant for a note-taking app. The user is working on the following note:\n\n---\n${noteContent.slice(0, 8000)}\n---\n\nAnswer questions about it or help improve it.`
            : 'You are a helpful AI assistant for a note-taking app. Help the user write, organize, and improve their notes.';

        const abortController = new AbortController();
        req.on('close', () => abortController.abort());

        try {
            await streamChat({
                messages,
                system,
                signal: abortController.signal,
                onChunk: (delta) => {
                    res.write(`data: ${JSON.stringify(delta)}\n\n`);
                },
            });
            res.write('data: [DONE]\n\n');
            res.end();
        } catch (err) {
            if (err.name === 'AbortError' || err.code === 'ERR_STREAM_DESTROYED') {
                return;
            }
            console.error('[AI] chat error:', err.message);
            if (!res.headersSent) {
                res.status(500).json({ message: 'AI request failed' });
            } else {
                res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
                res.end();
            }
        }
    }

    /**
     * POST /api/ai/inline
     * Body: { action: string, text: string, noteContent?: string }
     * Response: { result: string }
     */
    async inline(req, res) {
        const { action, text, noteContent } = req.body;

        if (!action || typeof action !== 'string') {
            return res.status(400).json({ message: 'action is required' });
        }
        if (!text || typeof text !== 'string') {
            return res.status(400).json({ message: 'text is required' });
        }

        if (!process.env.GROQ_API_KEY) {
            return res.status(503).json({ message: 'AI service is not configured' });
        }

        try {
            const result = await completeInline({ action, text, noteContent });
            res.json({ result });
        } catch (err) {
            console.error('[AI] inline error:', err.message);
            res.status(500).json({ message: err.message || 'AI request failed' });
        }
    }
}

export default new AiController();
