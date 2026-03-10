import { Router } from 'express';
import { fal } from '@fal-ai/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware } from '../middleware/auth.js';
import { getStorageProvider } from '../services/storage/index.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = Router();
const videosDir = path.resolve(__dirname, '../../uploads/videos');
if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
}
function toPublicUrl(url) {
    if (url.startsWith('http'))
        return url;
    const base = process.env.DEPLOY_BASE_URL || process.env.CDN_BASE_URL || `http://localhost:${process.env.PORT ?? '3002'}`;
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}
function initFal() {
    const key = process.env.FAL_KEY;
    if (!key)
        throw new Error('FAL_KEY not configured');
    fal.config({ credentials: key });
}
const ASPECT_RATIO_IMAGE = {
    '1:1': 'square_hd',
    '16:9': 'landscape_16_9',
    '9:16': 'portrait_16_9',
    '4:3': 'landscape_4_3',
    '3:4': 'portrait_4_3',
};
function clampDuration(value) {
    if (value === '3' || value === '5' || value === '10')
        return value;
    return '5';
}
function uid(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
function detectAspectRatio(message) {
    const msg = message.toLowerCase();
    if (msg.includes('vertical') ||
        msg.includes('reel') ||
        msg.includes('story') ||
        msg.includes('stories') ||
        msg.includes('9:16') ||
        msg.includes('tiktok')) {
        return '9:16';
    }
    if (msg.includes('cuadrado') || msg.includes('square') || msg.includes('1:1')) {
        return '1:1';
    }
    return '16:9';
}
function detectAudience(message) {
    const msg = message.toLowerCase();
    if (msg.includes('restaurante') || msg.includes('cafeter'))
        return 'Clientes cercanos que toman decisiones visuales y rapidas';
    if (msg.includes('ecommerce') || msg.includes('tienda') || msg.includes('producto'))
        return 'Compradores listos para comparar y convertir';
    if (msg.includes('saas') || msg.includes('software') || msg.includes('app'))
        return 'Usuarios que necesitan entender valor rapido';
    return 'Audiencia fria que necesita entender el beneficio en segundos';
}
function detectGoal(message) {
    const msg = message.toLowerCase();
    if (msg.includes('venta') || msg.includes('vende') || msg.includes('compr'))
        return 'conversion';
    if (msg.includes('anuncio') || msg.includes('ads') || msg.includes('campana'))
        return 'performance';
    if (msg.includes('marca') || msg.includes('branding'))
        return 'brand_awareness';
    return 'engagement';
}
function detectVisualStyle(message) {
    const msg = message.toLowerCase();
    if (msg.includes('premium') || msg.includes('lujo'))
        return 'Premium cinematic';
    if (msg.includes('minimal') || msg.includes('clean'))
        return 'Minimal modern';
    if (msg.includes('ugc') || msg.includes('testimonial'))
        return 'UGC social proof';
    if (msg.includes('energet') || msg.includes('vibrante'))
        return 'Bold high energy';
    return 'Commercial social ad';
}
function detectPlatform(aspectRatio, message) {
    const msg = message.toLowerCase();
    if (msg.includes('youtube'))
        return 'YouTube';
    if (msg.includes('facebook'))
        return 'Facebook';
    if (msg.includes('instagram'))
        return 'Instagram';
    if (msg.includes('tiktok'))
        return 'TikTok';
    if (aspectRatio === '9:16')
        return 'Instagram Reels';
    if (aspectRatio === '1:1')
        return 'Instagram Feed';
    return 'YouTube / Landing';
}
function extractSubject(message) {
    const clean = message
        .replace(/\b(vertical|horizontal|reel|story|cuadrado|square|10s|5s|3s|largo|corto|subir|upload|foto|imagen|genera|crea|quiero|necesito|hazme|un|una|de|para|con|mi|el|la|los|las|secuencia|sequence|escenas|scenes|avatar|ugc|video)\b/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return clean.length > 3 ? clean : message.trim();
}
function buildScenes(subject, message) {
    const style = detectVisualStyle(message);
    const goal = detectGoal(message);
    const durations = goal === 'performance' ? ['3', '3', '5'] : ['5', '5', '5'];
    return [
        {
            id: uid('scene'),
            title: 'Hook',
            prompt: `Opening hook for ${subject}. Strong first frame, ${style.toLowerCase()} style, clear focal point, camera movement, polished lighting, designed to stop the scroll immediately.`,
            duration: durations[0],
            imageUrl: null,
            videoUrl: null,
        },
        {
            id: uid('scene'),
            title: 'Value',
            prompt: `Show the main value of ${subject}. Product or offer in action, medium and close detail shots, believable environment, premium composition, visual proof of benefit, social ad pacing.`,
            duration: durations[1],
            imageUrl: null,
            videoUrl: null,
        },
        {
            id: uid('scene'),
            title: 'CTA',
            prompt: `Final reveal for ${subject}. Hero angle, decisive movement, bold ending frame, room for call to action, emotionally satisfying finish, commercial quality.`,
            duration: durations[2],
            imageUrl: null,
            videoUrl: null,
        },
    ];
}
function buildWorkflowDraft(message) {
    const aspectRatio = detectAspectRatio(message);
    const subject = extractSubject(message);
    const platform = detectPlatform(aspectRatio, message);
    const style = detectVisualStyle(message);
    const audience = detectAudience(message);
    const goal = detectGoal(message);
    const scenes = buildScenes(subject, message);
    const briefId = uid('brief');
    const scriptId = uid('script');
    const captionsId = uid('captions');
    const voiceId = uid('voice');
    const musicId = uid('music');
    const renderId = uid('render');
    const nodes = [
        {
            id: briefId,
            type: 'brief',
            position: { x: 40, y: 140 },
            data: {
                title: 'Brief',
                subject,
                platform,
                aspectRatio,
                audience,
                goal,
                style,
            },
        },
        {
            id: scriptId,
            type: 'script',
            position: { x: 320, y: 140 },
            data: {
                title: 'Script',
                hook: `Muestra ${subject} con un inicio que capture atencion en menos de 2 segundos.`,
                message: 'Enfatiza beneficio visual, claridad comercial y cierre con CTA.',
            },
        },
        ...scenes.map((scene, index) => ({
            id: scene.id,
            type: 'scene',
            position: { x: 640, y: 40 + (index * 180) },
            data: {
                title: scene.title,
                prompt: scene.prompt,
                duration: scene.duration,
                aspectRatio,
                imageUrl: scene.imageUrl,
                videoUrl: scene.videoUrl,
            },
        })),
        {
            id: captionsId,
            type: 'captions',
            position: { x: 980, y: 80 },
            data: {
                title: 'Captions',
                style: aspectRatio === '9:16' ? 'Bold mobile subtitles' : 'Clean lower third captions',
                language: 'es',
            },
        },
        {
            id: voiceId,
            type: 'voiceover',
            position: { x: 980, y: 240 },
            data: {
                title: 'Voiceover',
                enabled: goal !== 'engagement',
                script: `Presenta ${subject} con tono claro, directo y comercial.`,
            },
        },
        {
            id: musicId,
            type: 'music',
            position: { x: 980, y: 400 },
            data: {
                title: 'Music',
                mood: style,
            },
        },
        {
            id: renderId,
            type: 'render',
            position: { x: 1280, y: 220 },
            data: {
                title: 'Render',
                format: 'mp4',
                resolution: '1080p',
                aspectRatio,
            },
        },
    ];
    const edges = [
        { id: uid('edge'), source: briefId, target: scriptId, label: 'brief' },
        ...scenes.map(scene => ({ id: uid('edge'), source: scriptId, target: scene.id, label: 'scene' })),
        ...scenes.map(scene => ({ id: uid('edge'), source: scene.id, target: renderId, label: 'clip' })),
        { id: uid('edge'), source: captionsId, target: renderId, label: 'captions' },
        { id: uid('edge'), source: voiceId, target: renderId, label: 'voiceover' },
        { id: uid('edge'), source: musicId, target: renderId, label: 'music' },
    ];
    return {
        brief: {
            subject,
            platform,
            aspectRatio,
            audience,
            goal,
            style,
            deliveryMode: goal === 'performance' ? 'ad' : 'organic',
        },
        suggestions: {
            hook: `Abre con un visual fuerte de ${subject}.`,
            cta: goal === 'conversion' ? 'Ordena hoy' : 'Descubre mas',
            resources: [
                'Logo o identidad de marca',
                'Fotos del producto o screenshots',
                'Texto de oferta o CTA',
            ],
        },
        scenes,
        nodes,
        edges,
        aspectRatio,
    };
}
router.post('/generate-image', authMiddleware, async (req, res) => {
    try {
        initFal();
        const { prompt, aspectRatio = '1:1' } = req.body;
        const result = await fal.subscribe('fal-ai/flux-2-flex', {
            input: {
                prompt,
                image_size: (ASPECT_RATIO_IMAGE[aspectRatio] || 'square_hd'),
            },
        });
        const imageUrl = result.data?.images?.[0]?.url;
        if (!imageUrl)
            return res.status(500).json({ error: 'No image generated' });
        const imageRes = await fetch(imageUrl);
        const buffer = Buffer.from(await imageRes.arrayBuffer());
        const filename = `wf-img-${Date.now()}-${Math.round(Math.random() * 1e6)}.png`;
        const storage = getStorageProvider();
        const url = await storage.upload(buffer, filename, 'image/png');
        res.json({ success: true, url });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Workflow/Image]', msg);
        res.status(500).json({ error: msg });
    }
});
router.post('/text-to-video', authMiddleware, async (req, res) => {
    try {
        initFal();
        const { prompt, aspectRatio = '16:9', duration = '5' } = req.body;
        const result = await fal.subscribe('fal-ai/kling-video/v3/pro/text-to-video', {
            input: {
                prompt,
                duration: String(duration),
                aspect_ratio: aspectRatio,
                generate_audio: true,
            },
        });
        const videoUrl = result.data?.video?.url;
        if (!videoUrl)
            return res.status(500).json({ error: 'No video generated' });
        const videoRes = await fetch(videoUrl);
        const buffer = Buffer.from(await videoRes.arrayBuffer());
        const filename = `wf-vid-${Date.now()}-${Math.round(Math.random() * 1e6)}.mp4`;
        const storage = getStorageProvider();
        const url = await storage.upload(buffer, filename, 'video/mp4');
        res.json({ success: true, url });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Workflow/TextToVideo]', msg);
        res.status(500).json({ error: msg });
    }
});
router.post('/image-to-video', authMiddleware, async (req, res) => {
    try {
        initFal();
        const { imageUrl, prompt = '', aspectRatio = '16:9', duration = '5' } = req.body;
        if (!imageUrl)
            return res.status(400).json({ error: 'imageUrl required' });
        const publicImageUrl = toPublicUrl(imageUrl);
        console.log(`[Workflow/ImageToVideo] Using image: ${publicImageUrl}`);
        const result = await fal.subscribe('fal-ai/kling-video/v3/pro/image-to-video', {
            input: {
                prompt,
                image_url: publicImageUrl,
                duration: String(duration),
                aspect_ratio: aspectRatio,
                generate_audio: true,
            },
        });
        const videoUrl = result.data?.video?.url;
        if (!videoUrl)
            return res.status(500).json({ error: 'No video generated' });
        const videoRes = await fetch(videoUrl);
        const buffer = Buffer.from(await videoRes.arrayBuffer());
        const filename = `wf-vid-${Date.now()}-${Math.round(Math.random() * 1e6)}.mp4`;
        const storage = getStorageProvider();
        const url = await storage.upload(buffer, filename, 'video/mp4');
        res.json({ success: true, url });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Workflow/ImageToVideo]', msg);
        res.status(500).json({ error: msg });
    }
});
router.post('/sequence-video', authMiddleware, async (req, res) => {
    try {
        const { scenes } = req.body;
        if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
            return res.status(400).json({ error: 'scenes array required' });
        }
        const completedUrls = scenes
            .map(scene => scene.videoUrl)
            .filter((url) => typeof url === 'string' && url.length > 0);
        if (completedUrls.length === 0) {
            return res.status(400).json({ error: 'No generated scene clips available' });
        }
        res.json({
            success: true,
            url: completedUrls[completedUrls.length - 1],
            clips: completedUrls,
            message: completedUrls.length > 1
                ? 'Render final pendiente. Se devuelve el ultimo clip y el listado de clips generados.'
                : 'Se devolvio el clip generado.',
        });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Workflow/SequenceVideo]', msg);
        res.status(500).json({ error: msg });
    }
});
router.post('/draft', authMiddleware, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'message required' });
        }
        res.json(buildWorkflowDraft(message));
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({ error: msg });
    }
});
router.post('/assist', authMiddleware, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'message required' });
        }
        const draft = buildWorkflowDraft(message);
        res.json({
            ...draft,
            prompt: draft.scenes[0]?.prompt ?? '',
            scenes: draft.scenes.map(scene => ({
                prompt: scene.prompt,
                duration: clampDuration(scene.duration),
                title: scene.title,
            })),
        });
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({ error: msg });
    }
});
export default router;
//# sourceMappingURL=workflow.js.map