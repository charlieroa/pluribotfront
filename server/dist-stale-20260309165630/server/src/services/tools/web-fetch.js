/**
 * Fetches a webpage and returns clean text content for LLM analysis.
 * Strips scripts, styles, and HTML noise — keeps text + structure.
 */
async function fetchAndClean(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; PluryBot/1.0; +https://plury.co)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'es,en;q=0.5',
            },
            redirect: 'follow',
        });
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/xhtml')) {
            throw new Error(`Content-Type no soportado: ${contentType}`);
        }
        const html = await res.text();
        // Extract title
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '';
        // Extract links (up to 20)
        const links = [];
        const linkRegex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        let linkMatch;
        while ((linkMatch = linkRegex.exec(html)) !== null && links.length < 20) {
            const href = linkMatch[1];
            if (href.startsWith('http') || href.startsWith('/')) {
                const linkText = linkMatch[2].replace(/<[^>]+>/g, '').trim();
                if (linkText)
                    links.push(`${linkText} → ${href}`);
            }
        }
        // Clean HTML to readable text
        let text = html
            // Remove script/style/svg/noscript blocks
            .replace(/<(script|style|svg|noscript)[^>]*>[\s\S]*?<\/\1>/gi, '')
            // Remove HTML comments
            .replace(/<!--[\s\S]*?-->/g, '')
            // Convert common block elements to newlines
            .replace(/<\/(div|p|section|article|header|footer|main|nav|li|tr|h[1-6]|blockquote)>/gi, '\n')
            .replace(/<(br|hr)\s*\/?>/gi, '\n')
            // Remove remaining tags
            .replace(/<[^>]+>/g, ' ')
            // Decode HTML entities
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .replace(/&#\d+;/g, '')
            .replace(/&\w+;/g, '')
            // Clean whitespace
            .replace(/[ \t]+/g, ' ')
            .replace(/\n\s*\n/g, '\n\n')
            .trim();
        // Truncate to ~8000 chars to stay within LLM context limits
        if (text.length > 8000) {
            text = text.slice(0, 8000) + '\n\n[... contenido truncado por límite de tamaño]';
        }
        return { title, text, links };
    }
    finally {
        clearTimeout(timeout);
    }
}
export const webFetchTools = [
    {
        name: 'web_fetch',
        description: 'Visita una página web y extrae su contenido (texto, estructura, enlaces). Útil para analizar sitios de la competencia, obtener inspiración de diseño, extraer contenido para SEO, o revisar un sitio publicado.',
        parameters: {
            type: 'object',
            properties: {
                url: {
                    type: 'string',
                    description: 'URL completa de la página web a visitar (ej: https://ejemplo.com)',
                },
            },
            required: ['url'],
        },
        execute: async (input) => {
            const url = input.url;
            if (!url || typeof url !== 'string') {
                return 'Error: URL requerida';
            }
            // Validate URL
            let parsed;
            try {
                parsed = new URL(url);
            }
            catch {
                return `Error: URL inválida "${url}". Debe incluir https:// o http://`;
            }
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return 'Error: Solo se soportan URLs http/https';
            }
            // Block internal/private IPs
            const hostname = parsed.hostname;
            if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
                return 'Error: No se permite acceder a direcciones internas';
            }
            try {
                console.log(`[WebFetch] Fetching: ${url}`);
                const { title, text, links } = await fetchAndClean(url);
                const parts = [];
                parts.push(`📄 **Página:** ${url}`);
                if (title)
                    parts.push(`📌 **Título:** ${title}`);
                parts.push('');
                parts.push('---');
                parts.push('**CONTENIDO:**');
                parts.push(text || '(página sin contenido de texto)');
                if (links.length > 0) {
                    parts.push('');
                    parts.push('---');
                    parts.push(`**ENLACES ENCONTRADOS (${links.length}):**`);
                    parts.push(links.join('\n'));
                }
                return parts.join('\n');
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                if (msg.includes('abort')) {
                    return `Error: Timeout — la página ${url} tardó más de 15 segundos en responder`;
                }
                return `Error al acceder a ${url}: ${msg}`;
            }
        },
    },
];
//# sourceMappingURL=web-fetch.js.map