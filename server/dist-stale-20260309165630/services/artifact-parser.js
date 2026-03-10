import { resolveCDNDependencies, detectImportedPackages, transformImportsForCDN } from './cdn-resolver.js';
// Detect language from file extension
export function detectLanguage(filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
    const map = {
        ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
        json: 'json', css: 'css', html: 'html', md: 'markdown',
        svg: 'xml', yml: 'yaml', yaml: 'yaml', sh: 'bash',
        env: 'plaintext', gitignore: 'plaintext', txt: 'plaintext',
    };
    return map[ext] ?? 'plaintext';
}
// Parse <logicArtifact> from LLM output
export function parseArtifact(rawOutput) {
    // Find the artifact block — tolerant to whitespace/newlines
    const artifactMatch = rawOutput.match(/<logicArtifact\s+([^>]*)>([\s\S]*?)<\/logicArtifact>/);
    if (!artifactMatch)
        return null;
    const attrs = artifactMatch[1];
    const body = artifactMatch[2];
    // Extract attributes
    const idMatch = attrs.match(/id="([^"]*)"/);
    const titleMatch = attrs.match(/title="([^"]*)"/);
    const id = idMatch?.[1] ?? `project-${Date.now()}`;
    const title = titleMatch?.[1] ?? 'Proyecto';
    const files = [];
    const shellCommands = [];
    // Parse file actions — tolerant parser using indexOf-based approach
    // to handle content that might contain XML-like characters
    let pos = 0;
    while (pos < body.length) {
        const actionStart = body.indexOf('<logicAction', pos);
        if (actionStart === -1)
            break;
        const tagEnd = body.indexOf('>', actionStart);
        if (tagEnd === -1)
            break;
        const tagContent = body.substring(actionStart, tagEnd + 1);
        // Check if it's a self-closing tag (shell command)
        const isSelfClosing = tagContent.endsWith('/>');
        const typeMatch = tagContent.match(/type="([^"]*)"/);
        const type = typeMatch?.[1] ?? '';
        if (type === 'shell') {
            const cmdMatch = tagContent.match(/command="([^"]*)"/);
            if (cmdMatch)
                shellCommands.push(cmdMatch[1]);
            pos = tagEnd + 1;
            continue;
        }
        if (type === 'file') {
            const pathMatch = tagContent.match(/filePath="([^"]*)"/);
            const filePath = pathMatch?.[1] ?? 'unknown';
            if (isSelfClosing) {
                pos = tagEnd + 1;
                continue;
            }
            // Find closing tag
            const closeTag = '</logicAction>';
            const closeIdx = body.indexOf(closeTag, tagEnd);
            if (closeIdx === -1) {
                pos = tagEnd + 1;
                continue;
            }
            const content = body.substring(tagEnd + 1, closeIdx);
            // Trim leading/trailing newline but preserve internal formatting
            const trimmed = content.replace(/^\n/, '').replace(/\n$/, '');
            files.push({
                filePath,
                content: trimmed,
                language: detectLanguage(filePath),
            });
            pos = closeIdx + closeTag.length;
            continue;
        }
        pos = tagEnd + 1;
    }
    if (files.length === 0)
        return null;
    return { id, title, files, shellCommands: shellCommands.length > 0 ? shellCommands : undefined };
}
// Extract files from artifact (simple accessor)
export function extractFilesFromArtifact(artifact) {
    return artifact.files;
}
// Bundle a ProjectArtifact into a single HTML file for iframe preview
export function bundleToHtml(artifact) {
    // Find key files
    const appFile = artifact.files.find(f => f.filePath === 'src/App.tsx' || f.filePath === 'src/App.jsx' || f.filePath === 'src/App.ts');
    // If there's already an index.html with full content, just return it
    const indexHtml = artifact.files.find(f => f.filePath === 'index.html');
    if (indexHtml && indexHtml.content.includes('<body')) {
        return indexHtml.content;
    }
    // ─── Resolve CDN dependencies from package.json ───
    const cdnResolution = resolveCDNDependencies(artifact);
    // Also detect imports not in package.json and add to global map
    const detectedPkgs = detectImportedPackages(artifact.files);
    for (const pkg of detectedPkgs) {
        if (!cdnResolution.globalMap[pkg]) {
            // Check if we have a CDN mapping for this detected package
            const subResolution = resolveCDNDependencies({
                ...artifact,
                files: [{ filePath: 'package.json', content: JSON.stringify({ dependencies: { [pkg]: '*' } }), language: 'json' }],
            });
            if (Object.keys(subResolution.globalMap).length > 0) {
                cdnResolution.scriptTags.push(...subResolution.scriptTags);
                Object.assign(cdnResolution.globalMap, subResolution.globalMap);
                if (subResolution.inlineSetup) {
                    cdnResolution.inlineSetup += '\n' + subResolution.inlineSetup;
                }
            }
        }
    }
    // Inline all component source files into a single Babel script
    const componentFiles = artifact.files.filter(f => /\.(tsx?|jsx?)$/.test(f.filePath) && f.filePath.startsWith('src/'));
    // Sort: utils/hooks first, then components, then App.tsx last
    const sorted = [...componentFiles].sort((a, b) => {
        const isApp = (p) => /App\.(tsx?|jsx?)$/.test(p) ? 1 : 0;
        return isApp(a.filePath) - isApp(b.filePath);
    });
    // Process source files: transform imports and strip exports
    const processedSources = sorted.map(f => {
        let code = f.content;
        // Transform external imports to CDN globals, strip relative imports
        code = transformImportsForCDN(code, cdnResolution.globalMap);
        // Strip any remaining import statements (side-effect imports, CSS imports, etc.)
        code = code.replace(/^import\s+['"].*?['"]\s*;?\s*$/gm, '');
        // Convert "export default function X" → "function X"
        code = code.replace(/export\s+default\s+function\s+/g, 'function ');
        // Convert "export default " → "const _default = "
        code = code.replace(/export\s+default\s+/g, 'const _default_export = ');
        // Convert "export function" → "function"
        code = code.replace(/export\s+function\s+/g, 'function ');
        // Convert "export const" → "const"
        code = code.replace(/export\s+const\s+/g, 'const ');
        // Convert "export interface" → "" (strip TS interfaces)
        code = code.replace(/export\s+(interface|type)\s+[\s\S]*?(?=\n(?:export|const|function|class|import|\/\/)|\n\n)/g, '');
        // Strip remaining TypeScript type annotations inline
        code = code.replace(/:\s*(?:React\.)?(?:FC|ReactNode|ReactElement|string|number|boolean|any|void|null|undefined)(?:<[^>]*>)?/g, '');
        // Strip generic type params from function signatures
        code = code.replace(/<(?:Props|T|K|V)[^>]*>/g, '');
        return `// --- ${f.filePath} ---\n${code}`;
    });
    // Find CSS files
    const cssFiles = artifact.files.filter(f => f.filePath.endsWith('.css'));
    const cssContent = cssFiles.map(f => f.content).join('\n');
    // Extract package.json for title
    const pkgFile = artifact.files.find(f => f.filePath === 'package.json');
    let projectTitle = artifact.title;
    if (pkgFile) {
        try {
            const pkg = JSON.parse(pkgFile.content);
            if (pkg.name)
                projectTitle = pkg.name;
        }
        catch { }
    }
    // Find the App component name
    let appComponentName = 'App';
    if (appFile) {
        const fnMatch = appFile.content.match(/(?:export\s+default\s+)?function\s+(\w+)/);
        const constMatch = appFile.content.match(/(?:export\s+default\s+)?(?:const|let)\s+(\w+)/);
        appComponentName = fnMatch?.[1] ?? constMatch?.[1] ?? 'App';
    }
    // CDN script tags for external dependencies
    const cdnScripts = cdnResolution.scriptTags.length > 0
        ? '\n  ' + cdnResolution.scriptTags.join('\n  ')
        : '';
    // Error-catching script for auto-correction
    const errorScript = `<script>
    window.onerror=function(msg,url,line,col){window.parent.postMessage({type:'iframe-error',error:String(msg),line:line},'*')};
    window.onunhandledrejection=function(e){window.parent.postMessage({type:'iframe-error',error:String(e.reason),line:0},'*')};
  <\/script>`;
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectTitle}</title>
  ${errorScript}
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide-react@latest/dist/umd/lucide-react.js"><\/script>${cdnScripts}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; }
    ${cssContent}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-type="module">
    const { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext, useReducer, useLayoutEffect, forwardRef, lazy, Suspense, Fragment } = React;
    const Icons = window.lucideReact || {};
    ${cdnResolution.inlineSetup}

    ${processedSources.join('\n\n')}

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(${appComponentName}));
  <\/script>
</body>
</html>`;
}
//# sourceMappingURL=artifact-parser.js.map