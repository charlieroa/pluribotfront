import { GoogleGenAI } from '@google/genai';
import { getStorageProvider } from '../storage/index.js';
// ─── Failure cache: avoid hammering APIs that are down ───
const IMAGE_GEN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
// Google (Gemini / Imagen) cache
let googleAvailable = null;
let googleLastCheck = 0;
function isGoogleCachedAsFailed() {
    if (googleAvailable === null)
        return false;
    if (Date.now() - googleLastCheck > IMAGE_GEN_CACHE_TTL) {
        googleAvailable = null;
        return false;
    }
    return !googleAvailable;
}
function markGoogleResult(success) {
    googleAvailable = success;
    googleLastCheck = Date.now();
}
// Midjourney (Apiframe) cache
let midjourneyAvailable = null;
let midjourneyLastCheck = 0;
function isMidjourneyCachedAsFailed() {
    if (midjourneyAvailable === null)
        return false;
    if (Date.now() - midjourneyLastCheck > IMAGE_GEN_CACHE_TTL) {
        midjourneyAvailable = null;
        return false;
    }
    return !midjourneyAvailable;
}
function markMidjourneyResult(success) {
    midjourneyAvailable = success;
    midjourneyLastCheck = Date.now();
}
// ─── Midjourney via Apiframe (priority #1) ───
async function generateWithMidjourney(prompt, aspectRatio) {
    const apiKey = process.env.APIFRAME_API_KEY;
    if (!apiKey)
        return null;
    try {
        // Submit imagine task
        console.log('[Imagen/Midjourney] Submitting imagine task...');
        const submitRes = await fetch('https://api.apiframe.pro/imagine', {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt, aspect_ratio: aspectRatio }),
        });
        if (!submitRes.ok) {
            const errorText = await submitRes.text();
            console.log(`[Imagen/Midjourney] Submit failed (${submitRes.status}): ${errorText.substring(0, 200)}`);
            return null;
        }
        const submitData = await submitRes.json();
        const taskId = submitData.task_id;
        if (!taskId) {
            console.log('[Imagen/Midjourney] No task_id in response');
            return null;
        }
        console.log(`[Imagen/Midjourney] Task submitted: ${taskId}`);
        // Poll for result
        const maxAttempts = 8;
        const pollInterval = 5_000; // 5 seconds
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            console.log(`[Imagen/Midjourney] Polling attempt ${attempt}/${maxAttempts}...`);
            const fetchRes = await fetch('https://api.apiframe.pro/fetch', {
                method: 'POST',
                headers: {
                    'Authorization': apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ task_id: taskId }),
            });
            if (!fetchRes.ok) {
                console.log(`[Imagen/Midjourney] Fetch failed (${fetchRes.status})`);
                continue;
            }
            const fetchData = await fetchRes.json();
            if (fetchData.status === 'finished' && fetchData.image_url) {
                console.log(`[Imagen/Midjourney] Task finished, downloading image...`);
                const imageRes = await fetch(fetchData.image_url);
                if (!imageRes.ok) {
                    console.log(`[Imagen/Midjourney] Image download failed (${imageRes.status})`);
                    return null;
                }
                const arrayBuffer = await imageRes.arrayBuffer();
                console.log('[Imagen/Midjourney] Success');
                return Buffer.from(arrayBuffer);
            }
            if (fetchData.status && fetchData.status !== 'processing' && fetchData.status !== 'queued') {
                console.log(`[Imagen/Midjourney] Unexpected status: ${fetchData.status}`);
                return null;
            }
        }
        console.log('[Imagen/Midjourney] Timeout after polling');
        return null;
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`[Imagen/Midjourney] Error: ${msg.substring(0, 200)}`);
        return null;
    }
}
// ─── Gemini native image generation ───
async function generateWithGemini(client, prompt) {
    const modelNames = [
        'gemini-2.5-flash-preview-image-generation',
        'gemini-2.5-flash-image',
        'gemini-2.0-flash-exp-image-generation',
    ];
    for (const modelName of modelNames) {
        try {
            const response = await client.models.generateContent({
                model: modelName,
                contents: prompt,
                config: {
                    responseModalities: ['IMAGE', 'TEXT'],
                },
            });
            const parts = response.candidates?.[0]?.content?.parts;
            if (parts) {
                for (const part of parts) {
                    if (part.inlineData?.data) {
                        console.log(`[Imagen] Success with Gemini model: ${modelName}`);
                        return Buffer.from(part.inlineData.data, 'base64');
                    }
                }
            }
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.log(`[Imagen] Gemini model ${modelName} failed: ${msg.substring(0, 120)}`);
        }
    }
    return null;
}
// ─── Imagen API fallback (requires billing) ───
async function generateWithImagen(client, prompt, aspectRatio) {
    const modelNames = ['imagen-4.0-fast-generate-001', 'imagen-4.0-generate-001'];
    for (const modelName of modelNames) {
        try {
            const response = await client.models.generateImages({
                model: modelName,
                prompt,
                config: {
                    numberOfImages: 1,
                    aspectRatio,
                },
            });
            if (response.generatedImages && response.generatedImages.length > 0) {
                const image = response.generatedImages[0];
                if (image.image?.imageBytes) {
                    console.log(`[Imagen] Success with model: ${modelName}`);
                    return Buffer.from(image.image.imageBytes, 'base64');
                }
            }
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.log(`[Imagen] Model ${modelName} not available: ${msg.substring(0, 120)}`);
        }
    }
    return null;
}
const IMAGE_GEN_UNAVAILABLE_MSG = JSON.stringify({
    success: false,
    error: 'Image generation is temporarily unavailable (API quota exceeded or billing issue). DO NOT retry this tool — instead, create the design using only HTML, CSS, and Font Awesome icons. Use creative CSS techniques (gradients, clip-path, box-shadow, SVG inline) to produce a professional result without generated images.',
});
export const imagenTools = [
    {
        name: 'generate_image',
        description: 'Generates a high-quality image using AI. Use this to create logos, graphics, illustrations, photos, product images, and any visual content. The prompt MUST be in English for best results. If this tool fails, DO NOT call it again — use Font Awesome icons and CSS instead.',
        parameters: {
            type: 'object',
            properties: {
                prompt: {
                    type: 'string',
                    description: 'Detailed, enriched description of the image to generate, in ENGLISH. Must include: subject, style (photographic/illustration/vector/3D), color palette, composition, mood, lighting, background. Never pass the user prompt directly — always enrich it with professional art direction.',
                },
                aspectRatio: {
                    type: 'string',
                    enum: ['1:1', '16:9', '9:16', '4:3', '3:4'],
                    description: 'Aspect ratio of the image. Default: 1:1',
                },
            },
            required: ['prompt'],
        },
        execute: async (input) => {
            const prompt = input.prompt;
            const aspectRatio = input.aspectRatio || '1:1';
            // Fast-fail if ALL providers recently failed
            if (isMidjourneyCachedAsFailed() && isGoogleCachedAsFailed()) {
                console.log('[Imagen] Skipping — all providers cached as unavailable');
                return IMAGE_GEN_UNAVAILABLE_MSG;
            }
            let imageBuffer = null;
            // ── Priority 1: Midjourney via Apiframe — best quality for logos ──
            if (!isMidjourneyCachedAsFailed() && process.env.APIFRAME_API_KEY) {
                imageBuffer = await generateWithMidjourney(prompt, aspectRatio);
                if (imageBuffer) {
                    markMidjourneyResult(true);
                }
                else {
                    console.log('[Imagen] Midjourney failed, trying Google fallback...');
                    markMidjourneyResult(false);
                }
            }
            // ── Priority 2 & 3: Google (Gemini → Imagen 4) — fallback ──
            if (!imageBuffer && !isGoogleCachedAsFailed()) {
                const googleApiKey = process.env.GOOGLE_API_KEY;
                if (googleApiKey) {
                    try {
                        const client = new GoogleGenAI({ apiKey: googleApiKey });
                        imageBuffer = await generateWithGemini(client, prompt);
                        if (!imageBuffer) {
                            console.log('[Imagen] Gemini failed, falling back to Imagen 4...');
                            imageBuffer = await generateWithImagen(client, prompt, aspectRatio);
                        }
                        if (imageBuffer) {
                            markGoogleResult(true);
                        }
                        else {
                            markGoogleResult(false);
                        }
                    }
                    catch (err) {
                        const message = err instanceof Error ? err.message : String(err);
                        console.error('[Imagen] Google error:', message);
                        markGoogleResult(false);
                    }
                }
            }
            // ── All providers failed ──
            if (!imageBuffer) {
                return IMAGE_GEN_UNAVAILABLE_MSG;
            }
            // Save image via storage provider
            const filename = `img-${Date.now()}-${Math.round(Math.random() * 1e6)}.png`;
            const storage = getStorageProvider();
            const url = await storage.upload(imageBuffer, filename, 'image/png');
            return JSON.stringify({
                success: true,
                url,
                prompt,
                aspectRatio,
            });
        },
    },
];
//# sourceMappingURL=imagen.js.map