/**
 * Transforms a multi-file code project (JSON array of {path, content})
 * into a single self-contained HTML file that runs in the browser.
 *
 * Uses React UMD + Babel standalone for JSX compilation + esm.sh for external deps.
 */
/**
 * Check if a string looks like a multi-file code project (JSON array of files).
 */
export function isCodeProject(content) {
    const trimmed = content.trimStart();
    if (!trimmed.startsWith('['))
        return false;
    try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0]?.path === 'string' && typeof parsed[0]?.content === 'string';
    }
    catch {
        return false;
    }
}
/**
 * Build a self-contained HTML page from a multi-file code project.
 */
export function buildCodeProjectHtml(content) {
    const files = JSON.parse(content);
    // --- Package info ---
    const pkgFile = files.find(f => f.path === 'package.json');
    let title = 'Proyecto Plury';
    if (pkgFile) {
        try {
            const pkg = JSON.parse(pkgFile.content);
            title = pkg.name || title;
        }
        catch { }
    }
    // --- Scan all source files for external imports ---
    const builtins = new Set(['react', 'react-dom', 'react-dom/client', 'vite', 'tailwindcss', 'postcss', 'autoprefixer']);
    const externalDepsSet = new Set();
    for (const f of files) {
        if (!/\.(jsx?|tsx?)$/.test(f.path))
            continue;
        const importMatches = f.content.matchAll(/^\s*import\s+(?:\{[^}]+\}|\w+|\*\s+as\s+\w+)\s+from\s+['"]([^'"]+)['"]/gm);
        for (const m of importMatches) {
            const mod = m[1];
            if (!mod.startsWith('.') && !mod.startsWith('/') && !builtins.has(mod) && !mod.startsWith('@vitejs/')) {
                externalDepsSet.add(mod);
            }
        }
    }
    const externalDeps = [...externalDepsSet];
    // --- CSS ---
    const cssContent = files
        .filter(f => f.path.endsWith('.css'))
        .map(f => f.content)
        .join('\n')
        .replace(/@tailwind\s+\w+;\s*/g, '')
        .replace(/@import\s+['"]tailwindcss[^'"]*['"];\s*/g, '')
        .trim();
    // --- Source files (exclude config, main entry) ---
    const isConfig = (p) => /vite\.config|tailwind\.config|postcss\.config/.test(p);
    const isMain = (p) => /^(src\/)?(main|index)\.(jsx?|tsx?)$/.test(p);
    const sourceFiles = files.filter(f => /\.(jsx?|tsx?)$/.test(f.path) && !isConfig(f.path) && !isMain(f.path));
    // Topological sort: resolve local imports by matching filenames
    // Build lookup: basename (without ext) → file entry
    const fileByBasename = {};
    for (const f of sourceFiles) {
        const base = f.path.replace(/^src\//, '').replace(/\.(jsx?|tsx?|js|ts)$/, '');
        fileByBasename[base] = f;
        // Also index by just the filename (e.g., 'mockData' for 'data/mockData')
        const parts = base.split('/');
        const shortName = parts[parts.length - 1];
        if (!fileByBasename[shortName])
            fileByBasename[shortName] = f;
    }
    // For each file, find local imports (./X or ../X patterns)
    const deps = new Map();
    for (const f of sourceFiles) {
        const fileDeps = new Set();
        // Match all relative imports: './' or '../'
        const importPaths = f.content.matchAll(/^\s*import\s+.*?from\s+['"](\.[^'"]+)['"]/gm);
        for (const m of importPaths) {
            // Extract the last meaningful path segment: '../../data/mockData' → 'data/mockData'
            const raw = m[1];
            // Remove all leading ./ and ../ segments
            const cleaned = raw.replace(/^(\.\.?\/)+/, '');
            // Try multiple resolutions
            const candidates = [cleaned, `components/${cleaned}`, `data/${cleaned}`];
            const parts = cleaned.split('/');
            const shortName = parts[parts.length - 1];
            let found = false;
            for (const c of candidates) {
                if (fileByBasename[c] && fileByBasename[c] !== f) {
                    fileDeps.add(fileByBasename[c]);
                    found = true;
                    break;
                }
            }
            if (!found && fileByBasename[shortName] && fileByBasename[shortName] !== f) {
                fileDeps.add(fileByBasename[shortName]);
            }
        }
        deps.set(f, fileDeps);
    }
    // Kahn's topological sort
    const inDegree = new Map();
    for (const f of sourceFiles)
        inDegree.set(f, 0);
    for (const [, fileDeps] of deps) {
        for (const d of fileDeps) {
            inDegree.set(d, (inDegree.get(d) || 0) + 1);
        }
    }
    const sorted = [];
    const queue = sourceFiles.filter(f => (inDegree.get(f) || 0) === 0);
    while (queue.length > 0) {
        // Prefer non-App files
        queue.sort((a, b) => {
            const aIsApp = /\bApp\b/.test(a.path);
            const bIsApp = /\bApp\b/.test(b.path);
            if (aIsApp && !bIsApp)
                return 1;
            if (bIsApp && !aIsApp)
                return -1;
            return 0;
        });
        const f = queue.shift();
        sorted.push(f);
        for (const d of deps.get(f) || new Set()) {
            const newDeg = (inDegree.get(d) || 1) - 1;
            inDegree.set(d, newDeg);
            if (newDeg === 0)
                queue.push(d);
        }
    }
    // Reverse so dependencies come before dependents
    sorted.reverse();
    // Add any remaining (circular deps)
    for (const f of sourceFiles) {
        if (!sorted.includes(f))
            sorted.push(f);
    }
    sourceFiles.length = 0;
    sourceFiles.push(...sorted);
    // --- First pass: collect ALL imports across all files (deduplicated) ---
    const globalReactImports = new Set();
    // For external deps: track { originalName → Set<alias> } (e.g., X as Y means original=X, alias=Y)
    const globalDepImports = {};
    function collectImports(code) {
        for (const line of code.split('\n')) {
            const trimmed = line.trim();
            // import { X, Y, Z as W } from 'module'
            const namedMatch = trimmed.match(/^import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/);
            if (namedMatch) {
                const rawNames = namedMatch[1].split(',').map(n => n.trim()).filter(Boolean);
                const mod = namedMatch[2];
                if (mod === 'react') {
                    rawNames.forEach(n => {
                        const as = n.match(/^(\w+)\s+as\s+(\w+)$/);
                        globalReactImports.add(as ? `${as[1]} as ${as[2]}` : n);
                    });
                    continue;
                }
                if (mod === 'react-dom' || mod === 'react-dom/client')
                    continue;
                if (mod.startsWith('.') || mod.startsWith('/'))
                    continue;
                if (!globalDepImports[mod])
                    globalDepImports[mod] = { named: new Set(), aliases: new Map(), defaults: new Set() };
                for (const n of rawNames) {
                    const asMatch = n.match(/^(\w+)\s+as\s+(\w+)$/);
                    if (asMatch) {
                        globalDepImports[mod].named.add(asMatch[1]);
                        globalDepImports[mod].aliases.set(asMatch[2], asMatch[1]);
                    }
                    else {
                        globalDepImports[mod].named.add(n);
                    }
                }
                continue;
            }
            // import X from 'module'
            const defaultMatch = trimmed.match(/^import\s+(\w+)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/);
            if (defaultMatch) {
                const mod = defaultMatch[2];
                if (mod === 'react' || mod === 'react-dom' || mod === 'react-dom/client')
                    continue;
                if (mod.startsWith('.') || mod.startsWith('/'))
                    continue;
                if (!globalDepImports[mod])
                    globalDepImports[mod] = { named: new Set(), aliases: new Map(), defaults: new Set() };
                globalDepImports[mod].defaults.add(defaultMatch[1]);
            }
        }
    }
    for (const f of sourceFiles)
        collectImports(f.content);
    // Build global preamble (emitted ONCE at the top)
    const preambleLines = [];
    if (globalReactImports.size > 0) {
        preambleLines.push(`const { ${[...globalReactImports].join(', ')} } = React`);
    }
    for (const [mod, imports] of Object.entries(globalDepImports)) {
        if (imports.named.size > 0) {
            preambleLines.push(`const { ${[...imports.named].join(', ')} } = window.__deps['${mod}']`);
        }
        // Generate aliases: const alias = original
        for (const [alias, original] of imports.aliases) {
            preambleLines.push(`const ${alias} = ${original}`);
        }
        for (const d of imports.defaults) {
            preambleLines.push(`const ${d} = window.__deps['${mod}'].default || window.__deps['${mod}']`);
        }
    }
    // --- Second pass: strip imports/exports, generate aliases for renamed imports ---
    function stripImportsExports(code) {
        const lines = code.split('\n');
        const processed = [];
        for (const line of lines) {
            const trimmed = line.trim();
            // Handle import statements
            if (/^import\s+/.test(trimmed)) {
                // Check for local imports with renamed bindings: import { X as Y } from './...'
                const localNamedMatch = trimmed.match(/^import\s+\{([^}]+)\}\s+from\s+['"](\.[^'"]+)['"]\s*;?\s*$/);
                if (localNamedMatch) {
                    const bindings = localNamedMatch[1].split(',').map(b => b.trim()).filter(Boolean);
                    for (const b of bindings) {
                        const asMatch = b.match(/^(\w+)\s+as\s+(\w+)$/);
                        if (asMatch) {
                            // Generate alias: const Y = X
                            processed.push(`const ${asMatch[2]} = ${asMatch[1]}`);
                        }
                    }
                }
                continue; // Strip the import line itself
            }
            // export default
            if (trimmed.startsWith('export default ')) {
                processed.push(line.replace('export default ', ''));
                continue;
            }
            // export { X } — just remove
            if (/^export\s+\{/.test(trimmed))
                continue;
            // export function/const/let/var/class
            if (/^export\s+(function|const|let|var|class)\s/.test(trimmed)) {
                processed.push(line.replace(/^(\s*)export\s+/, '$1'));
                continue;
            }
            processed.push(line);
        }
        return processed.join('\n');
    }
    const processedCode = sourceFiles
        .map(f => `// --- ${f.path} ---\n${stripImportsExports(f.content)}`)
        .join('\n\n');
    // Combine: global preamble + all code + render call
    const fullCode = preambleLines.join('\n') + '\n\n' + processedCode + '\n\nReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App))\n';
    // Base64 encode to avoid HTML escaping issues
    const base64Code = Buffer.from(fullCode, 'utf-8').toString('base64');
    // Build dep loading statements — use ?external=react,react-dom so deps share our React
    const depLoadLines = externalDeps
        .map(dep => `      window.__deps['${dep}'] = await import('https://esm.sh/${dep}?external=react,react-dom')`)
        .join('\n');
    const escapedTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedTitle}</title>
  <script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@18",
      "react/jsx-runtime": "https://esm.sh/react@18/jsx-runtime",
      "react-dom": "https://esm.sh/react-dom@18",
      "react-dom/client": "https://esm.sh/react-dom@18/client"
    }
  }
  </script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  ${cssContent ? `<style>\n${cssContent}\n  </style>` : ''}
</head>
<body>
  <div id="root"></div>

  <script type="module">
    async function boot() {
      // Load React from esm.sh via import map — single instance for everything
      const ReactMod = await import('react')
      const ReactDOMMod = await import('react-dom/client')
      window.React = ReactMod
      window.ReactDOM = { createRoot: ReactDOMMod.createRoot }

      // Load external deps — ?external=react,react-dom makes them use our import-mapped React
      window.__deps = {}
      try {
${depLoadLines}
      } catch(e) { console.warn('[Plury] Dep load:', e) }

      // Decode source from base64
      const bytes = Uint8Array.from(atob('${base64Code}'), c => c.charCodeAt(0))
      const source = new TextDecoder().decode(bytes)

      // Transform JSX → JS
      const { code } = Babel.transform(source, {
        presets: [['react', { runtime: 'classic' }]],
        filename: 'app.jsx',
      })

      // Execute
      const fn = new Function(code)
      fn()
    }
    boot().catch(e => {
      console.error('[Plury] Boot error:', e)
      document.getElementById('root').innerHTML =
        '<div style="padding:2rem;font-family:system-ui;color:#ef4444">' +
        '<h2>Error cargando la aplicacion</h2>' +
        '<pre style="margin-top:1rem;font-size:0.85rem;color:#94a3b8;white-space:pre-wrap">' + e.message + '</pre></div>'
    })
  </script>
</body>
</html>`;
}
//# sourceMappingURL=code-to-html.js.map