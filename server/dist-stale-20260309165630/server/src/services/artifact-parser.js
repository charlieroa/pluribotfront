import { resolveCDNDependencies, detectImportedPackages, transformImportsForCDN, buildImportMap, buildModuleLoader, buildGlobalMap, buildFallbackPolyfillCode, INLINE_UTILS, } from './cdn-resolver.js';
import { UI_COMPONENTS_SOURCE } from './ui-components.js';
import { DESIGN_SYSTEM_CSS, TAILWIND_CONFIG_SCRIPT, INLINE_UTILS_CODE, ERROR_OVERLAY_SCRIPT, ERROR_BOUNDARY_CODE, REACT_HOOKS_DESTRUCTURE, LUCIDE_SETUP, } from '../../../shared/bundle-utils.js';
import ts from 'typescript';
// Strip TypeScript + compile JSX server-side (no Babel Standalone needed)
function stripTypeScript(code, fileName, diagnostics) {
    try {
        const result = ts.transpileModule(code, {
            compilerOptions: {
                jsx: ts.JsxEmit.React, // Compile JSX to React.createElement()
                jsxFactory: 'React.createElement',
                jsxFragmentFactory: 'React.Fragment',
                target: ts.ScriptTarget.ESNext, // Don't downlevel modern JS
                module: ts.ModuleKind.ESNext, // Keep import/export
                esModuleInterop: true,
                isolatedModules: true,
            },
            fileName,
            reportDiagnostics: true,
        });
        // Capture diagnostics if collector provided
        if (diagnostics && result.diagnostics && result.diagnostics.length > 0) {
            for (const diag of result.diagnostics) {
                const line = diag.file
                    ? ts.getLineAndCharacterOfPosition(diag.file, diag.start ?? 0).line + 1
                    : 0;
                diagnostics.push({
                    file: fileName,
                    line,
                    message: ts.flattenDiagnosticMessageText(diag.messageText, '\n'),
                    category: diag.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
                });
            }
        }
        return result.outputText;
    }
    catch (err) {
        console.warn(`[stripTypeScript] Failed for ${fileName}:`, err);
        if (diagnostics) {
            diagnostics.push({
                file: fileName,
                line: 0,
                message: `TypeScript compilation failed: ${String(err)}`,
                category: 'error',
            });
        }
        return code;
    }
}
// Legacy: Strip TS but preserve JSX for Babel Standalone (streaming preview)
function stripTypeScriptPreserveJsx(code, fileName) {
    try {
        const result = ts.transpileModule(code, {
            compilerOptions: {
                jsx: ts.JsxEmit.Preserve, // Keep JSX for Babel
                target: ts.ScriptTarget.ESNext,
                module: ts.ModuleKind.ESNext,
                esModuleInterop: true,
                isolatedModules: true,
            },
            fileName,
            reportDiagnostics: false,
        });
        return result.outputText;
    }
    catch (err) {
        console.warn(`[stripTypeScriptPreserveJsx] Failed for ${fileName}:`, err);
        return code;
    }
}
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
/**
 * Topological sort of source files based on inter-file imports.
 * Files that are imported by others come first. App.tsx always last.
 */
function topologicalSortFiles(files) {
    // Build a map of filePath → file
    const fileMap = new Map(files.map(f => [f.filePath, f]));
    // Build adjacency: if FileA imports from FileB, FileA depends on FileB
    const deps = new Map();
    for (const f of files) {
        deps.set(f.filePath, new Set());
    }
    // Extract relative imports and map them to actual files
    for (const f of files) {
        const importMatches = f.content.matchAll(/(?:^|\n)\s*import\s+[\s\S]*?from\s+['"](\.\/[^'"]+|\.\.\/[^'"]+)['"]/g);
        for (const match of importMatches) {
            const rawPath = match[1];
            // Resolve the relative import to a filePath
            const resolved = resolveRelativeImport(f.filePath, rawPath, files);
            if (resolved && resolved !== f.filePath) {
                deps.get(f.filePath).add(resolved);
            }
        }
    }
    // Kahn's algorithm for topological sort
    const inDegree = new Map();
    const dependents = new Map();
    for (const f of files) {
        inDegree.set(f.filePath, 0);
        dependents.set(f.filePath, []);
    }
    for (const [file, fileDeps] of deps) {
        for (const dep of fileDeps) {
            if (inDegree.has(dep)) {
                inDegree.set(file, (inDegree.get(file) ?? 0) + 1);
                dependents.get(dep).push(file);
            }
        }
    }
    const result = [];
    let queue = files
        .filter(f => (inDegree.get(f.filePath) ?? 0) === 0)
        .map(f => f.filePath);
    while (queue.length > 0) {
        // Sort each level alphabetically for determinism
        queue.sort();
        result.push(...queue);
        const nextQueue = [];
        for (const id of queue) {
            for (const dep of (dependents.get(id) ?? [])) {
                const newDeg = (inDegree.get(dep) ?? 1) - 1;
                inDegree.set(dep, newDeg);
                if (newDeg === 0)
                    nextQueue.push(dep);
            }
        }
        queue = nextQueue;
    }
    // Add any files not reached (circular deps) at the end
    for (const f of files) {
        if (!result.includes(f.filePath))
            result.push(f.filePath);
    }
    // Always move App.tsx to the very end
    const appIdx = result.findIndex(p => /App\.(tsx?|jsx?)$/.test(p));
    if (appIdx > -1) {
        const [appPath] = result.splice(appIdx, 1);
        result.push(appPath);
    }
    return result.map(p => fileMap.get(p)).filter(Boolean);
}
/** Resolve a relative import path to an actual filePath in the artifact */
function resolveRelativeImport(fromFile, importPath, files) {
    // Get directory of the importing file
    const parts = fromFile.split('/');
    parts.pop(); // remove filename
    const dir = parts.join('/');
    // Resolve relative path — prepend current dir for BOTH ./ and ../
    let resolved = importPath.startsWith('./')
        ? `${dir}/${importPath.slice(2)}`
        : importPath.startsWith('../')
            ? `${dir}/${importPath}`
            : importPath;
    // Normalize ../ segments: "src/components/../lib/utils" → "src/lib/utils"
    while (resolved.includes('../')) {
        const prev = resolved;
        resolved = resolved.replace(/[^/]+\/\.\.\//, '');
        if (resolved === prev)
            break; // prevent infinite loop
    }
    // Try exact match, then with extensions
    const extensions = ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.jsx', '/index.js'];
    for (const ext of extensions) {
        const candidate = resolved + ext;
        if (files.some(f => f.filePath === candidate))
            return candidate;
    }
    return null;
}
/**
 * Strip all export syntax from code. Handles:
 * - export default function Name / export default class Name
 * - export default anonymous (arrow, function(), class)
 * - export function / export const / export let / export var / export async function
 * - export class / export interface / export type / export enum
 * - export { A, B } (named export list)
 * - export { default as X } from '...' (re-exports)
 * - export * from '...'
 *
 * Returns: { code: string, defaultExportName: string | null }
 */
export function stripExports(code, filePath) {
    let defaultExportName = null;
    // 0. Pre-process: collapse multi-line export { ... } into single lines
    code = code.replace(/^(export\s+(?:type\s+)?)\{([\s\S]*?)\}(\s*(?:from\s+['"][^'"]*['"])?\s*;?\s*)$/gm, (_m, prefix, braces, suffix) => `${prefix.trim()} {${braces.replace(/\s+/g, ' ').trim()}}${suffix.trim()}`);
    // 0b. Strip type-only exports: export type { Foo, Bar } and export type { Foo } from '...'
    code = code.replace(/^export\s+type\s+\{[^}]*\}\s+from\s+['"][^'"]*['"]\s*;?\s*$/gm, '');
    code = code.replace(/^export\s+type\s+\{[^}]*\}\s*;?\s*$/gm, '');
    // 1. Strip re-exports entirely: export { ... } from '...', export * from '...'
    code = code.replace(/^export\s+\{[^}]*\}\s+from\s+['"][^'"]*['"]\s*;?\s*$/gm, '');
    code = code.replace(/^export\s+\*\s+from\s+['"][^'"]*['"]\s*;?\s*$/gm, '');
    code = code.replace(/^export\s+\*\s+as\s+\w+\s+from\s+['"][^'"]*['"]\s*;?\s*$/gm, '');
    // 2. Strip named export lists: export { A, B, C }
    code = code.replace(/^export\s+\{[^}]*\}\s*;?\s*$/gm, '');
    // 3. export default function Name → function Name (capture name)
    code = code.replace(/export\s+default\s+function\s+(\w+)/g, (_m, name) => {
        defaultExportName = name;
        return `function ${name}`;
    });
    // 4. export default class Name → class Name
    code = code.replace(/export\s+default\s+class\s+(\w+)/g, (_m, name) => {
        defaultExportName = name;
        return `class ${name}`;
    });
    // 5a. export default ExistingName — just re-exporting an existing variable/function.
    // Strip the line entirely to avoid duplicate const declarations (e.g. "const App = ...; export default App")
    code = code.replace(/^export\s+default\s+(\w+)\s*;?\s*$/gm, (_m, name) => {
        if (!defaultExportName)
            defaultExportName = name;
        return ''; // Variable is already in scope, just strip the export
    });
    // 5b. export default anonymous: () =>, function(), class {, object literal, etc.
    // Give it a deterministic name based on file
    code = code.replace(/export\s+default\s+/g, () => {
        if (!defaultExportName) {
            // Derive name from filePath: src/components/MyWidget.tsx → MyWidget
            const base = filePath.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') ?? 'DefaultExport';
            // PascalCase the name
            const name = base.charAt(0).toUpperCase() + base.slice(1);
            defaultExportName = name;
            return `const ${name} = `;
        }
        return 'const _default_export = ';
    });
    // 6. export async function → async function
    code = code.replace(/export\s+async\s+function\s+/g, 'async function ');
    // 7. export function → function
    code = code.replace(/export\s+function\s+/g, 'function ');
    // 8. export const / let / var → const / let / var
    code = code.replace(/export\s+const\s+/g, 'const ');
    code = code.replace(/export\s+let\s+/g, 'let ');
    code = code.replace(/export\s+var\s+/g, 'var ');
    // 9. export class / interface / type / enum
    code = code.replace(/export\s+class\s+/g, 'class ');
    code = code.replace(/export\s+interface\s+/g, 'interface ');
    code = code.replace(/export\s+type\s+/g, 'type ');
    code = code.replace(/export\s+enum\s+/g, 'enum ');
    return { code, defaultExportName };
}
// Bundle a ProjectArtifact into a single HTML file for iframe preview
// Dispatches between ESM (new) and Legacy (CDN) engines based on PREVIEW_ENGINE env var
export function bundleToHtml(artifact, supabaseConfig) {
    const engine = process.env.PREVIEW_ENGINE || 'esm';
    if (engine === 'cdn') {
        return { html: bundleToHtmlLegacy(artifact, supabaseConfig), diagnostics: [] };
    }
    return bundleToHtmlEsm(artifact, supabaseConfig);
}
// ─── NEW: ESM-based preview engine (esm.sh + Import Maps) ───
function bundleToHtmlEsm(artifact, supabaseConfig) {
    const diagnostics = [];
    const appFile = artifact.files.find(f => f.filePath === 'src/App.tsx' || f.filePath === 'src/App.jsx' || f.filePath === 'src/App.ts');
    // If there's already an index.html with full content, just return it
    const indexHtml = artifact.files.find(f => f.filePath === 'index.html');
    if (indexHtml && indexHtml.content.includes('<body')) {
        return { html: indexHtml.content, diagnostics: [] };
    }
    // ─── Detect all packages from source files + package.json ───
    const detectedPkgs = detectImportedPackages(artifact.files);
    const pkgFile = artifact.files.find(f => f.filePath === 'package.json');
    if (pkgFile) {
        try {
            const pkg = JSON.parse(pkgFile.content);
            const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
            for (const p of Object.keys(deps)) {
                if (!detectedPkgs.includes(p))
                    detectedPkgs.push(p);
            }
        }
        catch { }
    }
    // Build global map for all packages
    const globalMap = buildGlobalMap(detectedPkgs);
    // Build import map for esm.sh
    const importMap = buildImportMap(detectedPkgs);
    const importMapJson = JSON.stringify(importMap, null, 2);
    // Build module loader script
    const moduleLoaderCode = buildModuleLoader(detectedPkgs, globalMap);
    // Build fallback polyfill code (only applies if esm.sh failed)
    const polyfillCode = buildFallbackPolyfillCode(detectedPkgs);
    // Inline all component source files
    const componentFiles = artifact.files.filter(f => /\.(tsx?|jsx?)$/.test(f.filePath) && (f.filePath.startsWith('src/') ||
        f.filePath.startsWith('lib/') ||
        f.filePath.startsWith('components/')));
    // Topological sort: dependencies first, App.tsx last
    const sorted = topologicalSortFiles(componentFiles);
    // Process source files: strip TS + compile JSX, transform imports, strip exports
    let appComponentName = 'App';
    const processedSources = sorted.map(f => {
        let code = f.content;
        // Strip TypeScript + compile JSX server-side
        if (/\.tsx?$/.test(f.filePath)) {
            code = stripTypeScript(code, f.filePath, diagnostics);
        }
        // Transform external imports to globals, strip relative imports
        code = transformImportsForCDN(code, globalMap);
        // Strip any remaining import statements
        code = code.replace(/^import\s+['"].*?['"]\s*;?\s*$/gm, '');
        code = code.replace(/^import\s+type\s+.*$/gm, '');
        code = code.replace(/^import\s+\w+\s+from\s+['"].*\.css['"]\s*;?\s*$/gm, '');
        code = code.replace(/import\.meta\.env\.\w+/g, "''");
        code = code.replace(/process\.env\.\w+/g, "''");
        // Strip all export syntax
        const { code: strippedCode, defaultExportName } = stripExports(code, f.filePath);
        code = strippedCode;
        const isAppFile = /App\.(tsx?|jsx?)$/.test(f.filePath);
        if (isAppFile && defaultExportName) {
            appComponentName = defaultExportName;
        }
        return `// --- ${f.filePath} ---\n${code}`;
    });
    // Fallback: detect App component name from raw source
    if (appComponentName === 'App' && appFile) {
        const fnMatch = appFile.content.match(/(?:export\s+default\s+)?function\s+(\w+)/);
        if (fnMatch?.[1])
            appComponentName = fnMatch[1];
    }
    // Find CSS files
    const cssFiles = artifact.files.filter(f => f.filePath.endsWith('.css'));
    const cssContent = cssFiles.map(f => f.content).join('\n');
    // Extract project title
    let projectTitle = artifact.title;
    if (pkgFile) {
        try {
            const pkg = JSON.parse(pkgFile.content);
            if (pkg.name)
                projectTitle = pkg.name;
        }
        catch { }
    }
    // Shared constants from bundle-utils
    const utilsCode = INLINE_UTILS_CODE;
    // Design system CSS + Tailwind config from shared bundle-utils
    const designSystemCSS = DESIGN_SYSTEM_CSS;
    const tailwindConfigScript = TAILWIND_CONFIG_SCRIPT;
    let html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectTitle}</title>
  ${ERROR_OVERLAY_SCRIPT}
  <script src="https://cdn.tailwindcss.com"><\/script>
  ${tailwindConfigScript}
  <script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide-react@0.460.0/dist/umd/lucide-react.js"><\/script>

  <!-- Import Map (BEFORE any type="module" scripts) -->
  <script type="importmap">
  ${importMapJson}
  <\/script>

  <style>
    ${designSystemCSS}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; }
    ${cssContent}
  </style>
</head>
<body>
  <div id="root"></div>

  <!-- Synchronous setup: hooks, utils, polyfills, UI lib -->
  <script>
    ${REACT_HOOKS_DESTRUCTURE}
    ${LUCIDE_SETUP}
    ${utilsCode}
    ${polyfillCode}

    // UI Component Library
    ${UI_COMPONENTS_SOURCE}
    var UI = window.__UI || {};
  <\/script>

  <!-- Module package loader (async, deferred) -->
  <script type="module">
    ${moduleLoaderCode}
  <\/script>

  <!-- User code (JSX compiled server-side, NO Babel needed) -->
  <script>
    (function() {
      function __run() {
        ${ERROR_BOUNDARY_CODE}

        ${processedSources.join('\n\n')}

        try {
          var root = ReactDOM.createRoot(document.getElementById('root'));
          root.render(React.createElement(__ErrorBoundary, null, React.createElement(${appComponentName})));
        } catch(e) {
          if (typeof window.__showError === 'function') {
            window.__showError(String(e), 0, 'render');
          }
          window.parent.postMessage({type:'iframe-error',error:String(e),line:0},'*');
        }
      }
      if (window.__pkgsReady) { __run(); }
      else { window.addEventListener('__pkgsReady', __run); }
      setTimeout(function() { if (!window.__pkgsReady) { window.__pkgsReady = true; __run(); } }, 5000);
    })();
  <\/script>
</body>
</html>`;
    // Replace Supabase placeholders with real credentials
    if (supabaseConfig) {
        html = html.replace(/https:\/\/your-project\.supabase\.co/g, supabaseConfig.url);
        html = html.replace(/your-anon-key/g, supabaseConfig.anonKey);
    }
    return { html, diagnostics };
}
// ─── LEGACY: CDN-based preview engine (Babel Standalone + UMD) ───
function bundleToHtmlLegacy(artifact, supabaseConfig) {
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
                // Deduplicate script tags
                for (const tag of subResolution.scriptTags) {
                    if (!cdnResolution.scriptTags.includes(tag)) {
                        cdnResolution.scriptTags.push(tag);
                    }
                }
                Object.assign(cdnResolution.globalMap, subResolution.globalMap);
                if (subResolution.inlineSetup) {
                    cdnResolution.inlineSetup += '\n' + subResolution.inlineSetup;
                }
            }
        }
    }
    // Inline all component source files — include src/ and also lib/, components/ at root
    const componentFiles = artifact.files.filter(f => /\.(tsx?|jsx?)$/.test(f.filePath) && (f.filePath.startsWith('src/') ||
        f.filePath.startsWith('lib/') ||
        f.filePath.startsWith('components/')));
    // Topological sort: dependencies first, App.tsx last
    const sorted = topologicalSortFiles(componentFiles);
    // Process source files: strip TS (preserve JSX for Babel), transform imports, strip exports
    let appComponentName = 'App';
    const processedSources = sorted.map(f => {
        let code = f.content;
        // Strip TypeScript syntax server-side but preserve JSX for Babel
        if (/\.tsx?$/.test(f.filePath)) {
            code = stripTypeScriptPreserveJsx(code, f.filePath);
        }
        // Transform external imports to CDN globals, strip relative imports
        code = transformImportsForCDN(code, cdnResolution.globalMap);
        // Strip any remaining import statements (side-effect imports, CSS imports, etc.)
        code = code.replace(/^import\s+['"].*?['"]\s*;?\s*$/gm, '');
        // Strip "import type" statements
        code = code.replace(/^import\s+type\s+.*$/gm, '');
        // Strip CSS module imports: import styles from './foo.module.css'
        code = code.replace(/^import\s+\w+\s+from\s+['"].*\.css['"]\s*;?\s*$/gm, '');
        // Replace import.meta.env.* and process.env.* with empty string (not available in CDN bundler)
        code = code.replace(/import\.meta\.env\.\w+/g, "''");
        code = code.replace(/process\.env\.\w+/g, "''");
        // Strip all export syntax
        const { code: strippedCode, defaultExportName } = stripExports(code, f.filePath);
        code = strippedCode;
        // Track the App component name from the App file
        const isAppFile = /App\.(tsx?|jsx?)$/.test(f.filePath);
        if (isAppFile && defaultExportName) {
            appComponentName = defaultExportName;
        }
        return `// --- ${f.filePath} ---\n${code}`;
    });
    // Fallback: detect App component name from raw source if not found via exports
    if (appComponentName === 'App' && appFile) {
        const fnMatch = appFile.content.match(/(?:export\s+default\s+)?function\s+(\w+)/);
        if (fnMatch?.[1])
            appComponentName = fnMatch[1];
    }
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
    // CDN script tags for external dependencies — add onerror handlers (Fase 2.3)
    const cdnScriptsWithErrorHandling = cdnResolution.scriptTags.map(tag => {
        // Add onerror to each script tag
        return tag.replace(/<script src="([^"]+)">/, `<script src="$1" onerror="window.__cdnErrors=(window.__cdnErrors||[]);window.__cdnErrors.push('$1');console.warn('[CDN] Failed to load: $1')">`);
    });
    const cdnScripts = cdnScriptsWithErrorHandling.length > 0
        ? '\n  ' + cdnScriptsWithErrorHandling.join('\n  ')
        : '';
    // ─── Ensure INLINE_UTILS are always available (needed by UI component library) ───
    const REQUIRED_UTILS = ['clsx', 'tailwind-merge', 'class-variance-authority', '@radix-ui/react-slot'];
    const inlineUtilsAlreadyLoaded = cdnResolution.inlineSetup;
    const extraUtils = [];
    for (const utilPkg of REQUIRED_UTILS) {
        const util = INLINE_UTILS[utilPkg];
        if (util && !inlineUtilsAlreadyLoaded.includes(util.globalName)) {
            extraUtils.push(util.code);
            cdnResolution.globalMap[utilPkg] = util.globalName;
        }
    }
    const allInlineSetup = extraUtils.length > 0
        ? extraUtils.join('\n') + '\n' + cdnResolution.inlineSetup
        : cdnResolution.inlineSetup;
    let html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectTitle}</title>
  ${ERROR_OVERLAY_SCRIPT}
  <script src="https://cdn.tailwindcss.com"><\/script>
  ${TAILWIND_CONFIG_SCRIPT}
  <script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide-react@0.460.0/dist/umd/lucide-react.js"><\/script>${cdnScripts}
  <style>
    ${DESIGN_SYSTEM_CSS}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; }
    ${cssContent}
  </style>
</head>
<body>
  <div id="root"></div>
  <script id="__app_source" type="text/plain">
    ${REACT_HOOKS_DESTRUCTURE}
    ${LUCIDE_SETUP}
    ${allInlineSetup}

    // UI Component Library
    ${UI_COMPONENTS_SOURCE}
    var UI = window.__UI || {};

    ${ERROR_BOUNDARY_CODE}

    ${processedSources.join('\n\n')}

    try {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(__ErrorBoundary, null, React.createElement(${appComponentName})));
    } catch(e) {
      if (typeof window.__showError === 'function') {
        window.__showError(String(e), 0, 'render');
      } else {
        var d=document.createElement('div');d.id='__error_overlay';
        d.style.cssText='position:fixed;inset:0;background:rgba(220,38,38,0.95);color:#fff;font-family:monospace;font-size:14px;padding:24px;z-index:999999;overflow:auto;';
        d.innerHTML='<h2 style="margin-bottom:12px">Render Error</h2><pre style="white-space:pre-wrap">'+String(e)+'</pre>';
        document.body.appendChild(d);
      }
      window.parent.postMessage({type:'iframe-error',error:String(e),line:0},'*');
    }
  </script>
  <script>
    // Fase 2.2: Manual Babel compilation with error catching
    // Instead of <script type="text/babel"> which fails silently,
    // we compile programmatically and catch compilation errors.
    (function() {
      var src = document.getElementById('__app_source');
      if (!src || !window.Babel) {
        if (window.__showError) window.__showError('Babel not loaded', 0, 'babel');
        return;
      }
      try {
        var compiled = Babel.transform(src.textContent, {
          presets: ['react', ['typescript', { allExtensions: true, isTSX: true }]],
          filename: 'app.tsx',
        });
        var script = document.createElement('script');
        script.textContent = compiled.code;
        document.body.appendChild(script);
      } catch(e) {
        var msg = e.message || String(e);
        var line = 0;
        var lineMatch = msg.match(/(\\d+):(\\d+)/);
        if (lineMatch) line = parseInt(lineMatch[1], 10);
        if (window.__showError) {
          window.__showError(msg, line, 'babel');
        }
        window.parent.postMessage({type:'iframe-error',error:msg,line:line,errorType:'babel'},'*');
      }
    })();
  <\/script>
</body>
</html>`;
    // Replace Supabase placeholders with real credentials
    if (supabaseConfig) {
        html = html.replace(/https:\/\/your-project\.supabase\.co/g, supabaseConfig.url);
        html = html.replace(/your-anon-key/g, supabaseConfig.anonKey);
    }
    return html;
}
//# sourceMappingURL=artifact-parser.js.map