import { getModelForFeature } from './aiService.js';

const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image';

export async function generateGeminiImageBytes(
    prompt: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn('[GeminiImage] GEMINI_API_KEY is not set');
        return null;
    }

    // Allow admin to configure image model via DB; fall back to env then hardcoded default
    const model = await getModelForFeature('IMAGE_GENERATION', process.env.GEMINI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const body = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
        },
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    const rawText = await res.text();
    if (!res.ok) {
        console.error('[GeminiImage] HTTP', res.status, rawText.slice(0, 800));
        return null;
    }

    let json: unknown;
    try {
        json = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
        console.error('[GeminiImage] Invalid JSON body');
        return null;
    }

    const candidates = (json as { candidates?: Array<{ content?: { parts?: unknown[] } }> }).candidates;
    const parts = candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) {
        console.warn('[GeminiImage] No candidates/parts');
        return null;
    }

    for (const p of parts) {
        const part = p as { inlineData?: { data?: string; mimeType?: string } };
        const inline = part?.inlineData;
        const data = inline?.data;
        if (data && typeof data === 'string') {
            const mimeType = inline.mimeType || 'image/png';
            return { buffer: Buffer.from(data, 'base64'), mimeType };
        }
    }

    console.warn('[GeminiImage] No image part in response');
    return null;
}
