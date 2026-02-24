import type { ProjectArtifact, ArtifactFile } from '../../../shared/types.js'
import { resolveCDNDependencies, detectImportedPackages, transformImportsForCDN } from './cdn-resolver.js'
import { UI_COMPONENTS_SOURCE } from './ui-components.js'
import ts from 'typescript'

// Strip TypeScript syntax server-side so Babel Standalone only handles JSX
function stripTypeScript(code: string, fileName: string): string {
  try {
    const result = ts.transpileModule(code, {
      compilerOptions: {
        jsx: ts.JsxEmit.Preserve,         // Keep JSX for Babel
        target: ts.ScriptTarget.ESNext,     // Don't downlevel modern JS
        module: ts.ModuleKind.ESNext,       // Keep import/export
        esModuleInterop: true,
        isolatedModules: true,
      },
      fileName,
      reportDiagnostics: false,
    })
    return result.outputText
  } catch (err) {
    console.warn(`[stripTypeScript] Failed for ${fileName}:`, err)
    return code
  }
}

// Detect language from file extension
export function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    json: 'json', css: 'css', html: 'html', md: 'markdown',
    svg: 'xml', yml: 'yaml', yaml: 'yaml', sh: 'bash',
    env: 'plaintext', gitignore: 'plaintext', txt: 'plaintext',
  }
  return map[ext] ?? 'plaintext'
}

// Parse <logicArtifact> from LLM output
export function parseArtifact(rawOutput: string): ProjectArtifact | null {
  // Find the artifact block — tolerant to whitespace/newlines
  const artifactMatch = rawOutput.match(
    /<logicArtifact\s+([^>]*)>([\s\S]*?)<\/logicArtifact>/
  )
  if (!artifactMatch) return null

  const attrs = artifactMatch[1]
  const body = artifactMatch[2]

  // Extract attributes
  const idMatch = attrs.match(/id="([^"]*)"/)
  const titleMatch = attrs.match(/title="([^"]*)"/)

  const id = idMatch?.[1] ?? `project-${Date.now()}`
  const title = titleMatch?.[1] ?? 'Proyecto'

  const files: ArtifactFile[] = []
  const shellCommands: string[] = []

  // Parse file actions — tolerant parser using indexOf-based approach
  // to handle content that might contain XML-like characters
  let pos = 0
  while (pos < body.length) {
    const actionStart = body.indexOf('<logicAction', pos)
    if (actionStart === -1) break

    const tagEnd = body.indexOf('>', actionStart)
    if (tagEnd === -1) break

    const tagContent = body.substring(actionStart, tagEnd + 1)

    // Check if it's a self-closing tag (shell command)
    const isSelfClosing = tagContent.endsWith('/>')

    const typeMatch = tagContent.match(/type="([^"]*)"/)
    const type = typeMatch?.[1] ?? ''

    if (type === 'shell') {
      const cmdMatch = tagContent.match(/command="([^"]*)"/)
      if (cmdMatch) shellCommands.push(cmdMatch[1])
      pos = tagEnd + 1
      continue
    }

    if (type === 'file') {
      const pathMatch = tagContent.match(/filePath="([^"]*)"/)
      const filePath = pathMatch?.[1] ?? 'unknown'

      if (isSelfClosing) {
        pos = tagEnd + 1
        continue
      }

      // Find closing tag
      const closeTag = '</logicAction>'
      const closeIdx = body.indexOf(closeTag, tagEnd)
      if (closeIdx === -1) {
        pos = tagEnd + 1
        continue
      }

      const content = body.substring(tagEnd + 1, closeIdx)
      // Trim leading/trailing newline but preserve internal formatting
      const trimmed = content.replace(/^\n/, '').replace(/\n$/, '')

      files.push({
        filePath,
        content: trimmed,
        language: detectLanguage(filePath),
      })

      pos = closeIdx + closeTag.length
      continue
    }

    pos = tagEnd + 1
  }

  if (files.length === 0) return null

  return { id, title, files, shellCommands: shellCommands.length > 0 ? shellCommands : undefined }
}

// Extract files from artifact (simple accessor)
export function extractFilesFromArtifact(artifact: ProjectArtifact): ArtifactFile[] {
  return artifact.files
}

/**
 * Topological sort of source files based on inter-file imports.
 * Files that are imported by others come first. App.tsx always last.
 */
function topologicalSortFiles(files: { filePath: string; content: string }[]): { filePath: string; content: string }[] {
  // Build a map of filePath → file
  const fileMap = new Map(files.map(f => [f.filePath, f]))

  // Build adjacency: if FileA imports from FileB, FileA depends on FileB
  const deps = new Map<string, Set<string>>()
  for (const f of files) {
    deps.set(f.filePath, new Set())
  }

  // Extract relative imports and map them to actual files
  for (const f of files) {
    const importMatches = f.content.matchAll(/(?:^|\n)\s*import\s+[\s\S]*?from\s+['"](\.\/[^'"]+|\.\.\/[^'"]+)['"]/g)
    for (const match of importMatches) {
      const rawPath = match[1]
      // Resolve the relative import to a filePath
      const resolved = resolveRelativeImport(f.filePath, rawPath, files)
      if (resolved && resolved !== f.filePath) {
        deps.get(f.filePath)!.add(resolved)
      }
    }
  }

  // Kahn's algorithm for topological sort
  const inDegree = new Map<string, number>()
  const dependents = new Map<string, string[]>()
  for (const f of files) {
    inDegree.set(f.filePath, 0)
    dependents.set(f.filePath, [])
  }
  for (const [file, fileDeps] of deps) {
    for (const dep of fileDeps) {
      if (inDegree.has(dep)) {
        inDegree.set(file, (inDegree.get(file) ?? 0) + 1)
        dependents.get(dep)!.push(file)
      }
    }
  }

  const result: string[] = []
  let queue = files
    .filter(f => (inDegree.get(f.filePath) ?? 0) === 0)
    .map(f => f.filePath)

  while (queue.length > 0) {
    // Sort each level alphabetically for determinism
    queue.sort()
    result.push(...queue)
    const nextQueue: string[] = []
    for (const id of queue) {
      for (const dep of (dependents.get(id) ?? [])) {
        const newDeg = (inDegree.get(dep) ?? 1) - 1
        inDegree.set(dep, newDeg)
        if (newDeg === 0) nextQueue.push(dep)
      }
    }
    queue = nextQueue
  }

  // Add any files not reached (circular deps) at the end
  for (const f of files) {
    if (!result.includes(f.filePath)) result.push(f.filePath)
  }

  // Always move App.tsx to the very end
  const appIdx = result.findIndex(p => /App\.(tsx?|jsx?)$/.test(p))
  if (appIdx > -1) {
    const [appPath] = result.splice(appIdx, 1)
    result.push(appPath)
  }

  return result.map(p => fileMap.get(p)!).filter(Boolean)
}

/** Resolve a relative import path to an actual filePath in the artifact */
function resolveRelativeImport(fromFile: string, importPath: string, files: { filePath: string }[]): string | null {
  // Get directory of the importing file
  const parts = fromFile.split('/')
  parts.pop() // remove filename
  const dir = parts.join('/')

  // Resolve relative path
  let resolved = importPath.startsWith('./')
    ? `${dir}/${importPath.slice(2)}`
    : importPath // handle ../ if needed

  // Normalize ../
  while (resolved.includes('../')) {
    resolved = resolved.replace(/[^/]+\/\.\.\//, '')
  }

  // Try exact match, then with extensions
  const extensions = ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts', '/index.jsx', '/index.js']
  for (const ext of extensions) {
    const candidate = resolved + ext
    if (files.some(f => f.filePath === candidate)) return candidate
  }
  return null
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
function stripExports(code: string, filePath: string): { code: string; defaultExportName: string | null } {
  let defaultExportName: string | null = null

  // 1. Strip re-exports entirely: export { ... } from '...', export * from '...'
  code = code.replace(/^export\s+\{[^}]*\}\s+from\s+['"][^'"]*['"]\s*;?\s*$/gm, '')
  code = code.replace(/^export\s+\*\s+from\s+['"][^'"]*['"]\s*;?\s*$/gm, '')
  code = code.replace(/^export\s+\*\s+as\s+\w+\s+from\s+['"][^'"]*['"]\s*;?\s*$/gm, '')

  // 2. Strip named export lists: export { A, B, C }
  code = code.replace(/^export\s+\{[^}]*\}\s*;?\s*$/gm, '')

  // 3. export default function Name → function Name (capture name)
  code = code.replace(/export\s+default\s+function\s+(\w+)/g, (_m, name) => {
    defaultExportName = name
    return `function ${name}`
  })

  // 4. export default class Name → class Name
  code = code.replace(/export\s+default\s+class\s+(\w+)/g, (_m, name) => {
    defaultExportName = name
    return `class ${name}`
  })

  // 5. export default anonymous: () =>, function(), class {
  // Give it a deterministic name based on file
  code = code.replace(/export\s+default\s+/g, (match) => {
    if (!defaultExportName) {
      // Derive name from filePath: src/components/MyWidget.tsx → MyWidget
      const base = filePath.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') ?? 'DefaultExport'
      // PascalCase the name
      const name = base.charAt(0).toUpperCase() + base.slice(1)
      defaultExportName = name
      return `const ${name} = `
    }
    return 'const _default_export = '
  })

  // 6. export async function → async function
  code = code.replace(/export\s+async\s+function\s+/g, 'async function ')

  // 7. export function → function
  code = code.replace(/export\s+function\s+/g, 'function ')

  // 8. export const / let / var → const / let / var
  code = code.replace(/export\s+const\s+/g, 'const ')
  code = code.replace(/export\s+let\s+/g, 'let ')
  code = code.replace(/export\s+var\s+/g, 'var ')

  // 9. export class / interface / type / enum
  code = code.replace(/export\s+class\s+/g, 'class ')
  code = code.replace(/export\s+interface\s+/g, 'interface ')
  code = code.replace(/export\s+type\s+/g, 'type ')
  code = code.replace(/export\s+enum\s+/g, 'enum ')

  return { code, defaultExportName }
}

// Bundle a ProjectArtifact into a single HTML file for iframe preview
export function bundleToHtml(artifact: ProjectArtifact, supabaseConfig?: { url: string; anonKey: string }): string {
  // Find key files
  const appFile = artifact.files.find(f =>
    f.filePath === 'src/App.tsx' || f.filePath === 'src/App.jsx' || f.filePath === 'src/App.ts'
  )

  // If there's already an index.html with full content, just return it
  const indexHtml = artifact.files.find(f => f.filePath === 'index.html')
  if (indexHtml && indexHtml.content.includes('<body')) {
    return indexHtml.content
  }

  // ─── Resolve CDN dependencies from package.json ───
  const cdnResolution = resolveCDNDependencies(artifact)

  // Also detect imports not in package.json and add to global map
  const detectedPkgs = detectImportedPackages(artifact.files)
  for (const pkg of detectedPkgs) {
    if (!cdnResolution.globalMap[pkg]) {
      // Check if we have a CDN mapping for this detected package
      const subResolution = resolveCDNDependencies({
        ...artifact,
        files: [{ filePath: 'package.json', content: JSON.stringify({ dependencies: { [pkg]: '*' } }), language: 'json' }],
      })
      if (Object.keys(subResolution.globalMap).length > 0) {
        // Deduplicate script tags
        for (const tag of subResolution.scriptTags) {
          if (!cdnResolution.scriptTags.includes(tag)) {
            cdnResolution.scriptTags.push(tag)
          }
        }
        Object.assign(cdnResolution.globalMap, subResolution.globalMap)
        if (subResolution.inlineSetup) {
          cdnResolution.inlineSetup += '\n' + subResolution.inlineSetup
        }
      }
    }
  }

  // Inline all component source files — include src/ and also lib/, components/ at root
  const componentFiles = artifact.files.filter(f =>
    /\.(tsx?|jsx?)$/.test(f.filePath) && (
      f.filePath.startsWith('src/') ||
      f.filePath.startsWith('lib/') ||
      f.filePath.startsWith('components/')
    )
  )

  // Topological sort: dependencies first, App.tsx last
  const sorted = topologicalSortFiles(componentFiles)

  // Process source files: strip TS, transform imports, strip exports
  let appComponentName = 'App'
  const processedSources = sorted.map(f => {
    let code = f.content
    // Strip TypeScript syntax server-side (generics, enums, satisfies, etc.)
    if (/\.tsx?$/.test(f.filePath)) {
      code = stripTypeScript(code, f.filePath)
    }
    // Transform external imports to CDN globals, strip relative imports
    code = transformImportsForCDN(code, cdnResolution.globalMap)
    // Strip any remaining import statements (side-effect imports, CSS imports, etc.)
    code = code.replace(/^import\s+['"].*?['"]\s*;?\s*$/gm, '')
    // Strip "import type" statements
    code = code.replace(/^import\s+type\s+.*$/gm, '')
    // Strip CSS module imports: import styles from './foo.module.css'
    code = code.replace(/^import\s+\w+\s+from\s+['"].*\.css['"]\s*;?\s*$/gm, '')
    // Replace import.meta.env.* and process.env.* with empty string (not available in CDN bundler)
    code = code.replace(/import\.meta\.env\.\w+/g, "''")
    code = code.replace(/process\.env\.\w+/g, "''")

    // Strip all export syntax
    const { code: strippedCode, defaultExportName } = stripExports(code, f.filePath)
    code = strippedCode

    // Track the App component name from the App file
    const isAppFile = /App\.(tsx?|jsx?)$/.test(f.filePath)
    if (isAppFile && defaultExportName) {
      appComponentName = defaultExportName
    }

    return `// --- ${f.filePath} ---\n${code}`
  })

  // Fallback: detect App component name from raw source if not found via exports
  if (appComponentName === 'App' && appFile) {
    const fnMatch = appFile.content.match(/(?:export\s+default\s+)?function\s+(\w+)/)
    if (fnMatch?.[1]) appComponentName = fnMatch[1]
  }

  // Find CSS files
  const cssFiles = artifact.files.filter(f => f.filePath.endsWith('.css'))
  const cssContent = cssFiles.map(f => f.content).join('\n')

  // Extract package.json for title
  const pkgFile = artifact.files.find(f => f.filePath === 'package.json')
  let projectTitle = artifact.title
  if (pkgFile) {
    try {
      const pkg = JSON.parse(pkgFile.content)
      if (pkg.name) projectTitle = pkg.name
    } catch {}
  }

  // CDN script tags for external dependencies — add onerror handlers (Fase 2.3)
  const cdnScriptsWithErrorHandling = cdnResolution.scriptTags.map(tag => {
    // Add onerror to each script tag
    return tag.replace(
      /<script src="([^"]+)">/,
      `<script src="$1" onerror="window.__cdnErrors=(window.__cdnErrors||[]);window.__cdnErrors.push('$1');console.warn('[CDN] Failed to load: $1')">`
    )
  })
  const cdnScripts = cdnScriptsWithErrorHandling.length > 0
    ? '\n  ' + cdnScriptsWithErrorHandling.join('\n  ')
    : ''

  // Error-catching script with visible overlay + postMessage to parent + console capture (Fase 2.2 + 2.4)
  const errorScript = `<script>
    (function(){
      var errors=[];
      function showError(msg,line,type){
        var s=String(msg);
        if(s.length>500)s=s.substring(0,500)+'...';
        errors.push({error:s,line:line||0,type:type||'runtime'});
        try{window.parent.postMessage({type:'iframe-error',error:s,line:line||0,errorType:type||'runtime'},'*');}catch(e){}
        var d=document.getElementById('__error_overlay');
        if(!d){d=document.createElement('div');d.id='__error_overlay';
          d.style.cssText='position:fixed;bottom:0;left:0;right:0;max-height:40%;overflow:auto;background:rgba(220,38,38,0.95);color:#fff;font-family:monospace;font-size:13px;padding:12px 16px;z-index:999999;backdrop-filter:blur(4px);border-top:2px solid #f87171;';
          document.body.appendChild(d);}
        var label=type==='babel'?'Compilation':type==='cdn'?'CDN Load':'Runtime';
        d.innerHTML+='<div style="margin-bottom:6px"><b>'+label+' Error'+(line?' (line '+line+')':'')+':</b> '+s.replace(/</g,'&lt;')+'</div>';
      }
      window.onerror=function(msg,url,line){showError(msg,line,'runtime')};
      window.onunhandledrejection=function(e){showError(e.reason,0,'runtime')};
      // Console capture — forward to parent (Fase 2.4)
      var origError=console.error,origWarn=console.warn;
      console.error=function(){origError.apply(console,arguments);try{window.parent.postMessage({type:'iframe-console',level:'error',args:Array.from(arguments).map(String)},'*');}catch(e){}};
      console.warn=function(){origWarn.apply(console,arguments);try{window.parent.postMessage({type:'iframe-console',level:'warn',args:Array.from(arguments).map(String)},'*');}catch(e){}};
      // CDN error check (Fase 2.3) — show after page load
      window.addEventListener('DOMContentLoaded',function(){
        if(window.__cdnErrors&&window.__cdnErrors.length>0){
          window.__cdnErrors.forEach(function(url){showError('Failed to load CDN package: '+url,0,'cdn');});
        }
      });
      window.__showError=showError;
    })();
  <\/script>`

  // React Error Boundary (Fase 2.1) — catches render errors and shows them
  const errorBoundaryCode = `
    class __ErrorBoundary extends React.Component {
      constructor(props) { super(props); this.state = { error: null, errorInfo: null }; }
      static getDerivedStateFromError(error) { return { error }; }
      componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        var msg = error ? (error.message || String(error)) : 'Unknown render error';
        if (typeof window.__showError === 'function') window.__showError(msg, 0, 'react');
      }
      render() {
        if (this.state.error) {
          return React.createElement('div', {
            style: { padding: '24px', fontFamily: 'monospace', background: '#1a1a2e', color: '#f87171', minHeight: '100vh' }
          },
            React.createElement('h2', { style: { marginBottom: '12px', color: '#fff', fontSize: '18px' } }, 'Component Error'),
            React.createElement('pre', { style: { whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.5', color: '#fca5a5' } },
              String(this.state.error) + (this.state.errorInfo ? '\\n\\n' + this.state.errorInfo.componentStack : '')
            ),
            React.createElement('button', {
              onClick: () => { this.setState({ error: null, errorInfo: null }); },
              style: { marginTop: '16px', padding: '8px 16px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }
            }, 'Reintentar')
          );
        }
        return this.props.children;
      }
    }`

  // ─── Ensure INLINE_UTILS are always available (needed by UI component library) ───
  const REQUIRED_UTILS = ['clsx', 'tailwind-merge', 'class-variance-authority', '@radix-ui/react-slot']
  const inlineUtilsAlreadyLoaded = cdnResolution.inlineSetup
  const extraUtils: string[] = []
  // Import INLINE_UTILS from cdn-resolver to check what's needed
  const INLINE_UTILS_MAP: Record<string, { code: string; globalName: string }> = {
    'clsx': {
      code: `function clsx(){for(var i=0,tmp,x,str='';i<arguments.length;i++){if(tmp=arguments[i]){if(typeof tmp==='string'){x=tmp}else if(Array.isArray(tmp)){x=clsx.apply(null,tmp)}else if(typeof tmp==='object'){x='';for(var k in tmp)if(tmp[k])x+=(x&&' ')+k}if(x)str+=(str&&' ')+x}}return str}
    window.__clsx={default:clsx,clsx:clsx};`,
      globalName: '__clsx',
    },
    'tailwind-merge': {
      code: `function twMerge(){return Array.from(arguments).flat(Infinity).filter(Boolean).join(' ')}
    window.__twMerge={twMerge:twMerge,default:twMerge};`,
      globalName: '__twMerge',
    },
    'class-variance-authority': {
      code: `function cva(base,config){return function(props){var r=base||'';if(config&&config.variants&&props){Object.keys(config.variants).forEach(function(k){var v=props[k]||((config.defaultVariants||{})[k]);if(v&&config.variants[k]&&config.variants[k][v])r+=' '+config.variants[k][v]})}return r}}
    window.__cva={cva:cva,default:cva};`,
      globalName: '__cva',
    },
    '@radix-ui/react-slot': {
      code: `const Slot = React.forwardRef(function(props, ref) { var children = props.children, rest = Object.assign({}, props); delete rest.children; if (React.isValidElement(children)) { return React.cloneElement(children, Object.assign({}, rest, { ref: ref })); } return React.createElement('span', Object.assign({}, rest, { ref: ref }), children); });
    window.__radixSlot={Slot:Slot,default:Slot};`,
      globalName: '__radixSlot',
    },
  }
  for (const utilPkg of REQUIRED_UTILS) {
    const util = INLINE_UTILS_MAP[utilPkg]
    if (util && !inlineUtilsAlreadyLoaded.includes(util.globalName)) {
      extraUtils.push(util.code)
      cdnResolution.globalMap[utilPkg] = util.globalName
    }
  }
  const allInlineSetup = extraUtils.length > 0
    ? extraUtils.join('\n') + '\n' + cdnResolution.inlineSetup
    : cdnResolution.inlineSetup

  // ─── Design System: CSS HSL tokens + professional base styles ───
  const designSystemCSS = `
    :root {
      --background: 0 0% 100%;
      --foreground: 240 10% 3.9%;
      --card: 0 0% 100%;
      --card-foreground: 240 10% 3.9%;
      --popover: 0 0% 100%;
      --popover-foreground: 240 10% 3.9%;
      --primary: 240 5.9% 10%;
      --primary-foreground: 0 0% 98%;
      --secondary: 240 4.8% 95.9%;
      --secondary-foreground: 240 5.9% 10%;
      --muted: 240 4.8% 95.9%;
      --muted-foreground: 240 3.8% 46.1%;
      --accent: 240 4.8% 95.9%;
      --accent-foreground: 240 5.9% 10%;
      --destructive: 0 84.2% 60.2%;
      --destructive-foreground: 0 0% 98%;
      --border: 240 5.9% 90%;
      --input: 240 5.9% 90%;
      --ring: 240 5.9% 10%;
      --radius: 0.5rem;
      --chart-1: 12 76% 61%;
      --chart-2: 173 58% 39%;
      --chart-3: 197 37% 24%;
      --chart-4: 43 74% 66%;
      --chart-5: 27 87% 67%;
    }
    .dark {
      --background: 240 10% 3.9%;
      --foreground: 0 0% 98%;
      --card: 240 10% 3.9%;
      --card-foreground: 0 0% 98%;
      --popover: 240 10% 3.9%;
      --popover-foreground: 0 0% 98%;
      --primary: 0 0% 98%;
      --primary-foreground: 240 5.9% 10%;
      --secondary: 240 3.7% 15.9%;
      --secondary-foreground: 0 0% 98%;
      --muted: 240 3.7% 15.9%;
      --muted-foreground: 240 5% 64.9%;
      --accent: 240 3.7% 15.9%;
      --accent-foreground: 0 0% 98%;
      --destructive: 0 62.8% 30.6%;
      --destructive-foreground: 0 0% 98%;
      --border: 240 3.7% 15.9%;
      --input: 240 3.7% 15.9%;
      --ring: 240 4.9% 83.9%;
      --chart-1: 220 70% 50%;
      --chart-2: 160 60% 45%;
      --chart-3: 30 80% 55%;
      --chart-4: 280 65% 60%;
      --chart-5: 340 75% 55%;
    }
    html { scroll-behavior: smooth; }
    body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; }
    h1, h2, h3, h4, h5, h6 { text-wrap: balance; }
    p { text-wrap: pretty; }
    img, video, svg { max-width: 100%; height: auto; }
    ::selection { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); }
    button, a, input, textarea, select { transition: color 0.15s, background-color 0.15s, border-color 0.15s, box-shadow 0.15s; }
    :focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 2px; }
    @keyframes fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slide-in-right { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes scale-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    .animate-fade-in { animation: fade-in 0.4s ease-out; }
    .animate-slide-in-right { animation: slide-in-right 0.3s ease-out; }
    .animate-scale-in { animation: scale-in 0.2s ease-out; }
  `

  // ─── Tailwind config with semantic tokens ───
  const tailwindConfigScript = `<script>
  tailwind.config = {
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          border: 'hsl(var(--border))',
          input: 'hsl(var(--input))',
          ring: 'hsl(var(--ring))',
          background: 'hsl(var(--background))',
          foreground: 'hsl(var(--foreground))',
          primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
          secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
          destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
          muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
          accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
          popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
          card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
          chart: { 1: 'hsl(var(--chart-1))', 2: 'hsl(var(--chart-2))', 3: 'hsl(var(--chart-3))', 4: 'hsl(var(--chart-4))', 5: 'hsl(var(--chart-5))' },
        },
        borderRadius: {
          lg: 'var(--radius)',
          md: 'calc(var(--radius) - 2px)',
          sm: 'calc(var(--radius) - 4px)',
        },
        keyframes: {
          'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
          'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        },
        animation: {
          'accordion-down': 'accordion-down 0.2s ease-out',
          'accordion-up': 'accordion-up 0.2s ease-out',
          'fade-in': 'fade-in 0.4s ease-out',
          'slide-in-right': 'slide-in-right 0.3s ease-out',
          'scale-in': 'scale-in 0.2s ease-out',
        },
      },
    },
  }
<\/script>`

  let html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectTitle}</title>
  ${errorScript}
  <script src="https://cdn.tailwindcss.com"><\/script>
  ${tailwindConfigScript}
  <script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide-react@0.460.0/dist/umd/lucide-react.js"><\/script>${cdnScripts}
  <style>
    ${designSystemCSS}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; }
    ${cssContent}
  </style>
</head>
<body>
  <div id="root"></div>
  <script id="__app_source" type="text/plain">
    const { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext, useReducer, useLayoutEffect, forwardRef, lazy, Suspense, Fragment, memo, startTransition } = React;
    const Icons = window.lucideReact || {};
    ${allInlineSetup}

    // UI Component Library
    ${UI_COMPONENTS_SOURCE}
    const UI = window.__UI || {};

    ${errorBoundaryCode}

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
</html>`

  // Replace Supabase placeholders with real credentials
  if (supabaseConfig) {
    html = html.replace(/https:\/\/your-project\.supabase\.co/g, supabaseConfig.url)
    html = html.replace(/your-anon-key/g, supabaseConfig.anonKey)
  }

  return html
}
