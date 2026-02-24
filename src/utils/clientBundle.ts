import type { ProjectArtifact } from '../types'

/**
 * Client-side lightweight bundler for progressive preview during streaming.
 * Generates a basic HTML page from streamed artifact files so the user sees
 * a live preview while Logic is still writing code.
 *
 * This is intentionally simpler than the server-side bundleToHtml — it skips
 * CDN resolution for extra packages and just provides React + Tailwind + Lucide
 * so the preview appears as fast as possible. The server's full bundle replaces
 * this once streaming completes.
 */
export function clientBundleToHtml(artifact: ProjectArtifact): string {
  // Only generate preview if we have at least an App file
  const appFile = artifact.files.find(
    f => f.filePath === 'src/App.tsx' || f.filePath === 'src/App.jsx' || f.filePath === 'src/App.ts'
  )
  if (!appFile) return ''

  // If there's already an index.html with body content, use it directly
  const indexHtml = artifact.files.find(f => f.filePath === 'index.html')
  if (indexHtml && indexHtml.content.includes('<body')) {
    return indexHtml.content
  }

  // Collect source files
  const sourceFiles = artifact.files.filter(
    f => /\.(tsx?|jsx?)$/.test(f.filePath) && f.filePath.startsWith('src/')
  )

  // Sort: utils/hooks first, components next, App.tsx last
  const sorted = [...sourceFiles].sort((a, b) => {
    const isApp = (p: string) => /App\.(tsx?|jsx?)$/.test(p) ? 1 : 0
    return isApp(a.filePath) - isApp(b.filePath)
  })

  // Simple source processing: strip imports/exports so Babel can handle the rest
  const processedSources = sorted.map(f => {
    let code = f.content
    // Strip import statements (Babel + CDN globals handle dependencies)
    code = code.replace(/^import\s+.*$/gm, '')
    // Convert "export default function X" → "function X"
    code = code.replace(/export\s+default\s+function\s+/g, 'function ')
    // Convert "export default " → "const _default_export = "
    code = code.replace(/export\s+default\s+/g, 'const _default_export = ')
    // Strip other exports
    code = code.replace(/export\s+(function|const|let|var|class|interface|type|enum)\s+/g, '$1 ')
    return `// --- ${f.filePath} ---\n${code}`
  })

  // Detect App component name
  let appComponentName = 'App'
  const fnMatch = appFile.content.match(/(?:export\s+default\s+)?function\s+(\w+)/)
  const constMatch = appFile.content.match(/(?:export\s+default\s+)?(?:const|let)\s+(\w+)/)
  appComponentName = fnMatch?.[1] ?? constMatch?.[1] ?? 'App'

  // Collect CSS
  const cssFiles = artifact.files.filter(f => f.filePath.endsWith('.css'))
  const cssContent = cssFiles.map(f => f.content).join('\n')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${artifact.title}</title>
  <script>
    (function(){
      function showError(msg,line){
        var s=String(msg);if(s.length>300)s=s.substring(0,300)+'...';
        try{window.parent.postMessage({type:'iframe-error',error:s,line:line||0},'*');}catch(e){}
      }
      window.onerror=function(msg,url,line){showError(msg,line)};
      window.onunhandledrejection=function(e){showError(e.reason)};
    })();
  <\/script>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide-react@0.460.0/dist/umd/lucide-react.js"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; }
    ${cssContent}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react,typescript">
    const { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext, useReducer, useLayoutEffect, forwardRef, Fragment } = React;
    const Icons = window.lucideReact || {};

    ${processedSources.join('\n\n')}

    try {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(${appComponentName}));
    } catch(e) {
      // Silently fail during streaming — partial code is expected
    }
  <\/script>
</body>
</html>`
}
