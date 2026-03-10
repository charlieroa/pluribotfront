import { getStorageProvider } from '../storage/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let removeBackground = null;
async function getRemoveBg() {
    if (!removeBackground) {
        const mod = await import('@imgly/background-removal-node');
        removeBackground = mod.default ?? mod.removeBackground;
    }
    return removeBackground;
}
// Resolve image URL: convert relative paths to local file reads or absolute URLs
async function fetchImageBuffer(imageUrl) {
    // If it's a relative path like /uploads/..., read from disk
    if (imageUrl.startsWith('/uploads/')) {
        const localPath = path.resolve(__dirname, '../../..', imageUrl.slice(1));
        console.log('[RemoveBG] Reading local file:', localPath);
        if (!fs.existsSync(localPath)) {
            throw new Error(`File not found: ${localPath}`);
        }
        return fs.readFileSync(localPath);
    }
    // If relative path without leading slash, also try local
    if (!imageUrl.startsWith('http')) {
        const base = process.env.APP_URL || process.env.DEPLOY_BASE_URL || 'https://plury.co';
        imageUrl = `${base}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        console.log('[RemoveBG] Resolved to:', imageUrl);
    }
    const res = await fetch(imageUrl);
    if (!res.ok) {
        throw new Error(`Failed to fetch image: ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
}
export const removeBgTools = [
    {
        name: 'remove_background',
        description: 'Removes the background from an image and returns a transparent PNG. Use this when the user uploads a logo, photo, or any image and wants the background removed. The image_url must be a URL from a previously uploaded image in the conversation.',
        parameters: {
            type: 'object',
            properties: {
                image_url: {
                    type: 'string',
                    description: 'The URL of the image to remove the background from. Must be a valid URL from an uploaded image.',
                },
            },
            required: ['image_url'],
        },
        execute: async (input) => {
            const imageUrl = input.image_url;
            if (!imageUrl) {
                return JSON.stringify({ success: false, error: 'No image URL provided.' });
            }
            try {
                console.log('[RemoveBG] Processing:', imageUrl);
                const imageBuffer = await fetchImageBuffer(imageUrl);
                const mimeType = imageUrl.endsWith('.png') ? 'image/png' : imageUrl.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
                const inputBlob = new Blob([new Uint8Array(imageBuffer)], { type: mimeType });
                // Remove background
                const removeBg = await getRemoveBg();
                const resultBlob = await removeBg(inputBlob);
                // Convert to buffer and upload
                const buffer = Buffer.from(await resultBlob.arrayBuffer());
                const filename = `nobg-${Date.now()}-${Math.round(Math.random() * 1e6)}.png`;
                const storage = getStorageProvider();
                const url = await storage.upload(buffer, filename, 'image/png');
                console.log('[RemoveBG] Success:', url);
                return JSON.stringify({
                    success: true,
                    url,
                    message: 'Background removed successfully. The image is now a transparent PNG.',
                });
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                console.error('[RemoveBG] Error:', message);
                return JSON.stringify({
                    success: false,
                    error: `Background removal failed: ${message}. Inform the user that the service is temporarily unavailable.`,
                });
            }
        },
    },
];
//# sourceMappingURL=remove-bg.js.map