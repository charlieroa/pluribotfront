import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { WebContainer } from '@webcontainer/api'
import { Loader2, Terminal, RefreshCw, AlertCircle, RotateCcw, ExternalLink } from 'lucide-react'

// Template project files for a Vite + React + Tailwind app
const TEMPLATE_FILES: Record<string, string> = {
  'package.json': JSON.stringify({
    name: 'plury-app',
    private: true,
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'vite --host 0.0.0.0 --port 4173',
      build: 'vite build',
      preview: 'vite preview --host 0.0.0.0 --port 4173',
    },
    dependencies: {
      react: '^18.3.1',
      'react-dom': '^18.3.1',
      'lucide-react': '^0.563.0',
      recharts: '^2.15.3',
      motion: '^12.23.24',
      gsap: '^3.14.2',
      clsx: '^2.1.1',
      'class-variance-authority': '^0.7.1',
      'tailwind-merge': '^3.3.1',
    },
    devDependencies: {
      '@tailwindcss/vite': '^4.0.0',
      '@types/react': '^18.3.28',
      '@types/react-dom': '^18.3.7',
      '@vitejs/plugin-react': '^4.7.0',
      tailwindcss: '^4.0.0',
      typescript: '^5.9.3',
      vite: '^6.4.1',
    },
  }, null, 2),

  'vite.config.js': `import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [tailwindcss(), react()],
})
`,

  'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(214.3 31.8% 91.4%)',
        input: 'hsl(214.3 31.8% 91.4%)',
        background: 'hsl(0 0% 100%)',
        foreground: 'hsl(222.2 84% 4.9%)',
        primary: { DEFAULT: 'hsl(222.2 47.4% 11.2%)', foreground: 'hsl(210 40% 98%)' },
        secondary: { DEFAULT: 'hsl(210 40% 96.1%)', foreground: 'hsl(222.2 47.4% 11.2%)' },
        destructive: { DEFAULT: 'hsl(0 84.2% 60.2%)', foreground: 'hsl(210 40% 98%)' },
        muted: { DEFAULT: 'hsl(210 40% 96.1%)', foreground: 'hsl(215.4 16.3% 46.9%)' },
        accent: { DEFAULT: 'hsl(210 40% 96.1%)', foreground: 'hsl(222.2 47.4% 11.2%)' },
        card: { DEFAULT: 'hsl(0 0% 100%)', foreground: 'hsl(222.2 84% 4.9%)' },
      },
      borderRadius: { lg: '0.5rem', md: 'calc(0.5rem - 2px)', sm: 'calc(0.5rem - 4px)' },
      fontFamily: { sans: ['Poppins', 'system-ui', '-apple-system', 'sans-serif'] },
    },
  },
  plugins: [],
}
`,

  'index.html': `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <title>Plury App</title>
</head>
<body class="antialiased font-sans">
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
`,

  'src/main.jsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
`,

  'src/index.css': `@import "tailwindcss";

@theme {
  --color-border: hsl(214.3 31.8% 91.4%);
  --color-input: hsl(214.3 31.8% 91.4%);
  --color-background: hsl(0 0% 100%);
  --color-foreground: hsl(222.2 84% 4.9%);
  --color-primary: hsl(222.2 47.4% 11.2%);
  --color-primary-foreground: hsl(210 40% 98%);
  --color-secondary: hsl(210 40% 96.1%);
  --color-secondary-foreground: hsl(222.2 47.4% 11.2%);
  --color-destructive: hsl(0 84.2% 60.2%);
  --color-destructive-foreground: hsl(210 40% 98%);
  --color-muted: hsl(210 40% 96.1%);
  --color-muted-foreground: hsl(215.4 16.3% 46.9%);
  --color-accent: hsl(210 40% 96.1%);
  --color-accent-foreground: hsl(222.2 47.4% 11.2%);
  --color-card: hsl(0 0% 100%);
  --color-card-foreground: hsl(222.2 84% 4.9%);
  --radius-lg: 0.5rem;
  --radius-md: calc(0.5rem - 2px);
  --radius-sm: calc(0.5rem - 4px);
  --font-sans: 'Poppins', system-ui, -apple-system, sans-serif;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
}
`,

  'src/App.jsx': `export default function App() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">Plury App</h1>
        <p className="text-muted-foreground">Generando tu proyecto...</p>
      </div>
    </div>
  )
}
`,
}

export interface ProjectFile {
  path: string
  content: string
}

interface WebContainerPreviewProps {
  files?: ProjectFile[]
  onReady?: () => void
  onError?: (error: string) => void
  onTerminalOutput?: (line: string) => void
}

interface PackageJsonShape {
  name: string
  private: boolean
  version: string
  type: 'module'
  scripts: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

interface NormalizedProject {
  files: Record<string, string>
  packageJson: PackageJsonShape
}

const LOCAL_CSS_IMPORT_RE = /import\s+['"](\.\/|\.\.\/)[^'"]+\.css['"]/g

// Convert flat file map to WebContainer's FileSystemTree format
function filesToTree(files: Record<string, string>) {
  const tree: Record<string, any> = {}
  for (const [path, content] of Object.entries(files)) {
    const parts = path.split('/')
    let current = tree
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = { directory: {} }
      }
      current = current[parts[i]].directory
    }
    current[parts[parts.length - 1]] = {
      file: { contents: content },
    }
  }
  return tree
}

let webcontainerInstance: WebContainer | null = null
let bootPromise: Promise<WebContainer> | null = null
let moduleDevProcess: any = null

async function getWebContainer(): Promise<WebContainer> {
  if (webcontainerInstance) return webcontainerInstance
  if (bootPromise) return bootPromise

  bootPromise = WebContainer.boot().then(wc => {
    webcontainerInstance = wc
    return wc
  }).catch(err => {
    // Don't reset bootPromise — WebContainer.boot() can only be called ONCE per page.
    // If it fails, subsequent calls will also fail. Keep the rejected promise cached.
    console.error('[WebContainer] Boot failed:', err)
    throw err
  })
  return bootPromise
}

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function ensureFile(files: Record<string, string>, path: string, content: string) {
  if (!files[path]) files[path] = content
}

function resolveRelativeProjectPath(fromPath: string, importPath: string): string | null {
  const fromParts = fromPath.split('/').slice(0, -1)
  const importParts = importPath.split('/')
  const resolved = [...fromParts]

  for (const part of importParts) {
    if (!part || part === '.') continue
    if (part === '..') {
      if (resolved.length <= 1) return null
      resolved.pop()
      continue
    }
    resolved.push(part)
  }

  const normalized = resolved.join('/')
  return normalized.startsWith('src/') ? normalized : null
}

function ensureMissingCssImports(files: Record<string, string>) {
  const paths = new Set(Object.keys(files))
  const missing = new Set<string>()

  for (const [path, content] of Object.entries(files)) {
    if (!/^src\/.*\.(js|jsx|ts|tsx)$/.test(path)) continue
    for (const match of content.matchAll(LOCAL_CSS_IMPORT_RE)) {
      const importPath = match[0].match(/['"]([^'"]+\.css)['"]/)?.[1]
      if (!importPath) continue
      const resolved = resolveRelativeProjectPath(path, importPath)
      if (resolved && !paths.has(resolved)) missing.add(resolved)
    }
  }

  for (const cssPath of missing) {
    files[cssPath] = '/* Archivo CSS agregado automaticamente para evitar ENOENT en WebContainer. */\n'
  }
}

function sanitizeInjectedApiClient(content: string): string {
  return content
    .replace(/]\.join\('\r?\n'\)/g, "].join('\\\\n')")
    .replace(/]\.join\("\r?\n"\)/g, '].join("\\\\n")')
}

// Script injected into every project's index.html — handles theme changes, visual editing, and edit tracking
const PLURY_BRIDGE_SCRIPT = `<script>
(function(){
  // ─── Edit tracking ───
  window.__pluryEdits = [];
  window.__pluryTheme = null;

  function getSelector(el) {
    if (!el || el === document.body || el === document.documentElement) return 'body';
    var path = [];
    var current = el;
    while (current && current !== document.body && current !== document.documentElement) {
      var parent = current.parentElement;
      if (!parent) break;
      var siblings = Array.from(parent.children);
      var index = siblings.indexOf(current) + 1;
      var tag = current.tagName.toLowerCase();
      path.unshift(tag + ':nth-child(' + index + ')');
      current = parent;
    }
    return 'body > ' + path.join(' > ');
  }

  function trackEdit(edit) {
    window.__pluryEdits = window.__pluryEdits.filter(function(e) {
      return !(e.type === edit.type && e.selector === edit.selector);
    });
    window.__pluryEdits.push(edit);
    window.parent.postMessage({ type: 'plury-has-edits', count: window.__pluryEdits.length }, '*');
  }

  // ─── Theme listener ───
  window.addEventListener('message', function(e) {
    if (!e.data) return;
    if (e.data.type === 'apply-theme') {
      var theme = e.data.theme;
      window.__pluryTheme = theme;
      var style = document.getElementById('plury-theme-override');
      if (!style) {
        style = document.createElement('style');
        style.id = 'plury-theme-override';
        document.head.appendChild(style);
      }
      var css = '';
      if (theme.fontFamily) {
        var fontName = theme.fontFamily.replace(/ /g, '+');
        if (!document.querySelector('link[href*="' + fontName + '"]')) {
          var link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://fonts.googleapis.com/css2?family=' + fontName + ':wght@300;400;500;600;700;800;900&display=swap';
          document.head.appendChild(link);
        }
        css += '*, *::before, *::after { font-family: "' + theme.fontFamily + '", system-ui, -apple-system, sans-serif !important; }\\n';
      }
      if (theme.colors) {
        if (theme.colors.primary && theme.colors.primary.DEFAULT)
          css += '[class*="bg-primary"] { background-color: ' + theme.colors.primary.DEFAULT + ' !important; }\\n'
            + '[class*="text-primary"] { color: ' + theme.colors.primary.DEFAULT + ' !important; }\\n'
            + '[class*="border-primary"] { border-color: ' + theme.colors.primary.DEFAULT + ' !important; }\\n';
        if (theme.colors.secondary && theme.colors.secondary.DEFAULT)
          css += '[class*="bg-secondary"] { background-color: ' + theme.colors.secondary.DEFAULT + ' !important; }\\n'
            + '[class*="text-secondary"] { color: ' + theme.colors.secondary.DEFAULT + ' !important; }\\n';
        if (theme.colors.accent && theme.colors.accent.DEFAULT)
          css += '[class*="bg-accent"] { background-color: ' + theme.colors.accent.DEFAULT + ' !important; }\\n'
            + '[class*="text-accent"] { color: ' + theme.colors.accent.DEFAULT + ' !important; }\\n';
        if (theme.colors.background)
          css += '.bg-background, [class*="bg-background"] { background-color: ' + theme.colors.background + ' !important; }\\n';
      }
      style.textContent = css;
    }

    // ─── Visual edit mode ───
    if (e.data.type === 'toggle-edit-mode') {
      window.__pluryEditMode = e.data.enabled;
      document.body.style.cursor = e.data.enabled ? 'crosshair' : '';
      if (!e.data.enabled && window.__plurySelectedEl) {
        window.__plurySelectedEl = null;
        var ov = document.getElementById('plury-edit-overlay');
        if (ov) ov.style.display = 'none';
        var lb = document.getElementById('plury-edit-label');
        if (lb) lb.style.display = 'none';
      }
    }

    if (e.data.type === 'apply-style' && window.__plurySelectedEl) {
      var styles = e.data.styles;
      for (var prop in styles) {
        if (styles.hasOwnProperty(prop)) {
          var kebab = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
          window.__plurySelectedEl.style.setProperty(kebab, styles[prop], 'important');
        }
      }
      trackEdit({ type: 'style', selector: getSelector(window.__plurySelectedEl), styles: styles });
    }

    if (e.data.type === 'replace-image' && window.__plurySelectedEl && window.__plurySelectedEl.tagName === 'IMG') {
      window.__plurySelectedEl.src = e.data.url;
      if (e.data.alt) window.__plurySelectedEl.alt = e.data.alt;
      trackEdit({ type: 'image', selector: getSelector(window.__plurySelectedEl), src: e.data.url });
    }

    if (e.data.type === 'delete-element' && window.__plurySelectedEl) {
      var delSel = getSelector(window.__plurySelectedEl);
      window.__plurySelectedEl.remove();
      window.__plurySelectedEl = null;
      var ov2 = document.getElementById('plury-edit-overlay');
      if (ov2) ov2.style.display = 'none';
      window.parent.postMessage({ type: 'element-deselected' }, '*');
      trackEdit({ type: 'style', selector: delSel, styles: { display: 'none' } });
    }

    if (e.data.type === 'inject-font') {
      var fn = e.data.fontName;
      if (fn && !document.querySelector('link[href*="' + fn + '"]')) {
        var lk = document.createElement('link');
        lk.rel = 'stylesheet';
        lk.href = 'https://fonts.googleapis.com/css2?family=' + fn + ':wght@300;400;500;600;700;800;900&display=swap';
        document.head.appendChild(lk);
      }
    }

    // ─── Collect edits for save ───
    if (e.data.type === 'get-visual-edits') {
      window.parent.postMessage({
        type: 'visual-edits-response',
        edits: window.__pluryEdits,
        theme: window.__pluryTheme
      }, '*');
    }
  });

  // ─── Click/hover handling for visual edit ───
  function getLabel(el) {
    if (!el) return 'Elemento';
    var tag = el.tagName;
    if (tag === 'IMG') return 'Imagen';
    if (tag === 'VIDEO') return 'Video';
    if (tag === 'NAV') return 'Navegacion';
    if (tag === 'HEADER') return 'Header';
    if (tag === 'FOOTER') return 'Footer';
    if (tag === 'SECTION') return 'Seccion';
    if (tag === 'H1') return 'Titulo H1';
    if (tag === 'H2') return 'Titulo H2';
    if (tag === 'H3') return 'Titulo H3';
    if (tag === 'P') return 'Parrafo';
    if (tag === 'BUTTON') return 'Boton';
    if (tag === 'A') return 'Enlace';
    if (tag === 'SPAN') return 'Texto';
    if (tag === 'DIV') {
      var cls = (el.className || '').toLowerCase();
      if (cls.includes('hero') || cls.includes('banner')) return 'Hero';
      if (cls.includes('card')) return 'Tarjeta';
      return 'Bloque';
    }
    return tag.toLowerCase();
  }

  function showOverlay(el) {
    var ov = document.getElementById('plury-edit-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'plury-edit-overlay';
      ov.style.cssText = 'position:fixed;pointer-events:none;z-index:99999;border:2px solid #3b82f6;border-radius:3px;box-shadow:0 0 0 1px rgba(255,255,255,0.5);transition:all 0.1s ease;';
      document.body.appendChild(ov);
    }
    var lb = document.getElementById('plury-edit-label');
    if (!lb) {
      lb = document.createElement('div');
      lb.id = 'plury-edit-label';
      lb.style.cssText = 'position:fixed;pointer-events:none;z-index:100000;font-family:system-ui;font-size:10px;font-weight:700;padding:2px 8px;border-radius:0 0 4px 0;background:#3b82f6;color:#fff;white-space:nowrap;transition:all 0.1s ease;';
      document.body.appendChild(lb);
    }
    var r = el.getBoundingClientRect();
    ov.style.top = r.top + 'px';
    ov.style.left = r.left + 'px';
    ov.style.width = r.width + 'px';
    ov.style.height = r.height + 'px';
    ov.style.display = 'block';
    lb.textContent = getLabel(el);
    lb.style.top = Math.max(0, r.top) + 'px';
    lb.style.left = r.left + 'px';
    lb.style.display = 'block';
  }

  document.addEventListener('click', function(e) {
    if (!window.__pluryEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    var el = e.target;
    if (el.id === 'plury-edit-overlay' || el.id === 'plury-edit-label') return;
    window.__plurySelectedEl = el;
    showOverlay(el);
    var r = el.getBoundingClientRect();
    window.parent.postMessage({
      type: 'element-selected',
      tag: el.tagName.toLowerCase(),
      text: el.textContent ? el.textContent.substring(0, 100) : '',
      isImage: el.tagName === 'IMG',
      imageSrc: el.tagName === 'IMG' ? el.src : null,
      rect: { top: r.top, left: r.left, width: r.width, height: r.height },
      classes: el.className || '',
      elementLabel: getLabel(el)
    }, '*');
  }, true);

  document.addEventListener('mousemove', function(e) {
    if (!window.__pluryEditMode) return;
    var el = e.target;
    if (el.id === 'plury-edit-overlay' || el.id === 'plury-edit-label') return;
    if (el !== window.__plurySelectedEl) {
      var ov = document.getElementById('plury-edit-overlay');
      var lb = document.getElementById('plury-edit-label');
      if (ov && lb) {
        var r = el.getBoundingClientRect();
        ov.style.top = r.top + 'px';
        ov.style.left = r.left + 'px';
        ov.style.width = r.width + 'px';
        ov.style.height = r.height + 'px';
        ov.style.border = '1.5px dashed #3b82f6';
        ov.style.display = 'block';
        lb.textContent = getLabel(el);
        lb.style.top = Math.max(0, r.top) + 'px';
        lb.style.left = r.left + 'px';
        lb.style.display = 'block';
      }
    }
  });

  document.addEventListener('dblclick', function(e) {
    if (!window.__pluryEditMode) return;
    var el = e.target;
    if (el.tagName === 'IMG' || el.tagName === 'SCRIPT') return;
    var editSel = getSelector(el);
    el.contentEditable = 'true';
    el.style.outline = '2px solid #3b82f6';
    el.focus();
    el.addEventListener('blur', function handler() {
      el.contentEditable = 'false';
      el.style.outline = '';
      el.removeEventListener('blur', handler);
      trackEdit({ type: 'text', selector: editSel, text: el.textContent || '' });
    });
  });

  document.addEventListener('mouseleave', function() {
    if (!window.__pluryEditMode) return;
    var ov = document.getElementById('plury-edit-overlay');
    var lb = document.getElementById('plury-edit-label');
    if (ov) ov.style.display = 'none';
    if (lb) lb.style.display = 'none';
  });

  // ─── Notify parent that bridge is ready (handles Vite HMR reloads) ───
  window.parent.postMessage({ type: 'plury-bridge-ready' }, '*');
})();
</script>`

/** Inject the Plury bridge script into index.html if not already present */
function injectBridgeScript(html: string): string {
  if (html.includes('plury-theme-override') || html.includes('plury-edit-overlay')) return html
  if (html.includes('</body>')) {
    return html.replace('</body>', `${PLURY_BRIDGE_SCRIPT}\n</body>`)
  }
  return html + PLURY_BRIDGE_SCRIPT
}

function normalizeProjectFiles(inputFiles?: ProjectFile[]): NormalizedProject {
  const mergedFiles: Record<string, string> = { ...TEMPLATE_FILES }
  for (const file of inputFiles ?? []) {
    mergedFiles[file.path] = file.content
  }

  ensureMissingCssImports(mergedFiles)

  if (mergedFiles['src/lib/api.js']) {
    mergedFiles['src/lib/api.js'] = sanitizeInjectedApiClient(mergedFiles['src/lib/api.js'])
  }

  const hasTypescript = Object.keys(mergedFiles).some(path => /\.(ts|tsx)$/.test(path))
  const appEntry = mergedFiles['src/App.tsx']
    ? 'src/App.tsx'
    : mergedFiles['src/App.jsx']
      ? 'src/App.jsx'
      : hasTypescript
        ? 'src/App.tsx'
        : 'src/App.jsx'
  const mainEntry = mergedFiles['src/main.tsx']
    ? 'src/main.tsx'
    : mergedFiles['src/main.jsx']
      ? 'src/main.jsx'
      : hasTypescript
        ? 'src/main.tsx'
        : 'src/main.jsx'

  if (!mergedFiles[appEntry]) {
    mergedFiles[appEntry] = appEntry.endsWith('.tsx')
      ? `export default function App() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="text-center max-w-xl">
        <h1 className="text-3xl font-bold text-foreground mb-3">Proyecto cargado con fallback</h1>
        <p className="text-muted-foreground">El agente no genero un App principal valido. Se creo este archivo para evitar un preview en blanco.</p>
      </div>
    </div>
  )
}
`
      : TEMPLATE_FILES['src/App.jsx']
  }

  if (!mergedFiles[mainEntry]) {
    const appImport = appEntry.endsWith('.tsx') ? './App.tsx' : './App'
    mergedFiles[mainEntry] = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '${appImport}'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
`
  }

  ensureFile(mergedFiles, 'src/index.css', TEMPLATE_FILES['src/index.css'])
  ensureFile(mergedFiles, 'vite.config.js', TEMPLATE_FILES['vite.config.js'])
  ensureFile(mergedFiles, 'tailwind.config.js', TEMPLATE_FILES['tailwind.config.js'])
  ensureFile(mergedFiles, 'index.html', TEMPLATE_FILES['index.html'].replace('/src/main.jsx', `/${mainEntry}`))
  delete mergedFiles['postcss.config.js']
  // Inject the Plury bridge script (theme listener + visual editor) into index.html
  mergedFiles['index.html'] = injectBridgeScript(mergedFiles['index.html'])

  const templatePkg = safeJsonParse<PackageJsonShape>(TEMPLATE_FILES['package.json'], {
    name: 'plury-app',
    private: true,
    version: '1.0.0',
    type: 'module',
    scripts: {},
    dependencies: {},
    devDependencies: {},
  })
  const userPkg = safeJsonParse<PackageJsonShape>(mergedFiles['package.json'] ?? '', templatePkg)

  const combinedSource = Object.entries(mergedFiles)
    .filter(([path]) => /\.(js|jsx|ts|tsx)$/.test(path))
    .map(([, content]) => content)
    .join('\n')

  const inferredDeps: Record<string, string> = {
    react: '^18.3.1',
    'react-dom': '^18.3.1',
  }
  if (combinedSource.includes('lucide-react')) inferredDeps['lucide-react'] = '^0.563.0'
  if (combinedSource.includes('recharts')) inferredDeps.recharts = '^2.15.3'
  if (combinedSource.includes('@xyflow/react')) inferredDeps['@xyflow/react'] = '^12.10.1'
  if (combinedSource.includes('gsap')) inferredDeps.gsap = '^3.14.2'
  if (combinedSource.includes('motion/react')) inferredDeps.motion = '^12.23.24'
  if (combinedSource.includes('class-variance-authority')) inferredDeps['class-variance-authority'] = '^0.7.1'
  if (combinedSource.includes('tailwind-merge')) inferredDeps['tailwind-merge'] = '^3.3.1'
  if (combinedSource.includes('clsx')) inferredDeps.clsx = '^2.1.1'
  if (combinedSource.includes('@react-three/fiber') || combinedSource.includes('react-three')) {
    inferredDeps.three = '^0.172.0'
    inferredDeps['@react-three/fiber'] = '^8.18.0'
    inferredDeps['@react-three/drei'] = '^9.122.0'
  }

  const inferredDevDeps: Record<string, string> = {
    '@tailwindcss/vite': '^4.0.0',
    vite: '^6.4.1',
    '@vitejs/plugin-react': '^4.7.0',
    tailwindcss: '^4.0.0',
  }
  if (hasTypescript) {
    inferredDevDeps.typescript = '^5.9.3'
    inferredDevDeps['@types/react'] = '^18.3.28'
    inferredDevDeps['@types/react-dom'] = '^18.3.7'
  }

  const normalizedPackage: PackageJsonShape = {
    ...templatePkg,
    ...userPkg,
    type: 'module',
    scripts: {
      ...(userPkg.scripts ?? {}),
      // Always override dev/preview to avoid --strictPort conflicts
      dev: 'vite --host 0.0.0.0 --port 4173',
      build: 'vite build',
      preview: 'vite preview --host 0.0.0.0 --port 4173',
    },
    dependencies: {
      ...(templatePkg.dependencies ?? {}),
      ...(userPkg.dependencies ?? {}),
      ...inferredDeps,
    },
    devDependencies: {
      ...(templatePkg.devDependencies ?? {}),
      ...(userPkg.devDependencies ?? {}),
      ...inferredDevDeps,
    },
  }

  mergedFiles['package.json'] = JSON.stringify(normalizedPackage, null, 2)
  return { files: mergedFiles, packageJson: normalizedPackage }
}

function extractTerminalIssues(chunk: string): string[] {
  // Strip ANSI escape codes for reliable matching
  const clean = chunk.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').replace(/\[[\d;]*m/g, '')
  const cleanLower = clean.toLowerCase()

  // Filter out transient Vite restart errors (WebContainer mounts files in phases)
  if (cleanLower.includes('server is being restarted or closed')
    || cleanLower.includes('request is outdated')
    || cleanLower.includes('failed to scan for dependencies')
    || cleanLower.includes('server restarted')
    || cleanLower.includes('vite:dep-scan')) {
    return []
  }

  const lines = clean
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  return lines.filter(line => {
    const lower = line.toLowerCase()
    return lower.includes('failed to resolve import')
      || lower.includes('transform failed')
      || lower.includes('internal server error')
      || lower.includes('pre-transform error')
      || lower.includes('error when starting dev server')
      || (lower.startsWith('error:') && !lower.includes('dep-scan') && !lower.includes('restarted'))
  })
}

export default function WebContainerPreview({
  files,
  onReady,
  onError,
  onTerminalOutput,
}: WebContainerPreviewProps) {
  const [status, setStatus] = useState<'booting' | 'installing' | 'starting' | 'ready' | 'error'>('booting')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [terminalLines, setTerminalLines] = useState<string[]>([])
  const [detectedIssues, setDetectedIssues] = useState<string[]>([])
  const [showTerminal, setShowTerminal] = useState(false)
  const [bootNonce, setBootNonce] = useState(0)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const statusRef = useRef(status)
  const bootRunRef = useRef(0)
  const initialBootDoneRef = useRef(false)
  const syncGraceRef = useRef(false)
  statusRef.current = status

  const normalized = useMemo(() => normalizeProjectFiles(files), [files])
  const normalizedRef = useRef(normalized)
  normalizedRef.current = normalized

  const addTerminalLine = useCallback((line: string) => {
    setTerminalLines(prev => [...prev.slice(-200), line])
    onTerminalOutput?.(line)
    setTimeout(() => {
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight
      }
    }, 50)
  }, [onTerminalOutput])

  const handleProcessOutput = useCallback((chunk: string) => {
    addTerminalLine(chunk)
    // Skip error detection during sync grace period (Vite restarts cause transient errors)
    if (syncGraceRef.current) return
    const issues = extractTerminalIssues(chunk)
    if (issues.length > 0) {
      setDetectedIssues(prev => [...prev, ...issues].slice(-8))
      setShowTerminal(true)
    }
  }, [addTerminalLine])

  const stopDevProcess = useCallback(async () => {
    try {
      await moduleDevProcess?.kill?.()
    } catch {}
    moduleDevProcess = null
    // Also kill any orphaned node/vite processes inside the WebContainer
    if (webcontainerInstance) {
      try {
        const kill = await webcontainerInstance.spawn('sh', ['-c', 'kill -9 $(pgrep -f vite) 2>/dev/null; exit 0'])
        await kill.exit
      } catch {}
    }
  }, [])

  useEffect(() => {
    async function boot() {
      const runId = ++bootRunRef.current
      initialBootDoneRef.current = false
      try {
        setPreviewUrl(null)
        setIframeLoaded(false)
        setErrorMsg(null)
        setDetectedIssues([])
        setTerminalLines([])
        setStatus('booting')
        addTerminalLine('> Booting WebContainer...')

        await stopDevProcess()
        const wc = await getWebContainer()
        if (bootRunRef.current !== runId) return

        addTerminalLine('> WebContainer ready')

        const currentNormalized = normalizedRef.current
        const tree = filesToTree(currentNormalized.files)
        await wc.mount(tree)
        try {
          await wc.fs.rm('postcss.config.js')
        } catch {}
        // Force-write package.json to ensure our scripts override any cached version
        await wc.fs.writeFile('package.json', currentNormalized.files['package.json'] ?? JSON.stringify(currentNormalized.packageJson, null, 2))
        addTerminalLine(`> Mounted ${Object.keys(currentNormalized.files).length} files`)
        addTerminalLine(`> Package: ${currentNormalized.packageJson.name}`)

        setStatus('installing')
        addTerminalLine('> npm install...')

        const installProcess = await wc.spawn('npm', ['install'])
        installProcess.output.pipeTo(
          new WritableStream({
            write(chunk) {
              handleProcessOutput(chunk)
            },
          })
        ).catch(() => {})

        const installExitCode = await installProcess.exit
        if (bootRunRef.current !== runId) return
        if (installExitCode !== 0) {
          throw new Error(`npm install failed with exit code ${installExitCode}`)
        }

        addTerminalLine('> Dependencies installed')

        setStatus('starting')
        addTerminalLine(`> Starting dev server: ${currentNormalized.packageJson.scripts?.dev ?? 'npm run dev'}`)

        // Grace period during initial boot — Vite dep-scan may fail transiently
        syncGraceRef.current = true
        setTimeout(() => { syncGraceRef.current = false }, 10000)

        const devProcess = await wc.spawn('npm', ['run', 'dev'])
        moduleDevProcess = devProcess
        devProcess.output.pipeTo(
          new WritableStream({
            write(chunk) {
              handleProcessOutput(chunk)
            },
          })
        ).catch(() => {})

        const serverReadyTimeout = setTimeout(() => {
          if (statusRef.current === 'starting' && bootRunRef.current === runId) {
            addTerminalLine('> Timeout: dev server did not start in 60s')
            setErrorMsg('El servidor de desarrollo no respondio. Revisa el terminal para ver errores.')
            setStatus('error')
          }
        }, 60000)

        wc.on('server-ready', (_port, url) => {
          if (bootRunRef.current !== runId) return
          clearTimeout(serverReadyTimeout)
          addTerminalLine(`> Dev server ready at ${url}`)
          setPreviewUrl(url)
          setStatus('ready')
          // Clear transient errors from boot/restart — server recovered successfully
          setDetectedIssues([])
          syncGraceRef.current = false
          // Mark initial boot done so the file sync effect skips the first trigger
          setTimeout(() => { initialBootDoneRef.current = true }, 500)
          onReady?.()
        })

        wc.on('error', err => {
          if (bootRunRef.current !== runId) return
          clearTimeout(serverReadyTimeout)
          addTerminalLine(`> Error: ${err.message}`)
          setErrorMsg(err.message)
          setStatus('error')
          onError?.(err.message)
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to boot WebContainer'
        addTerminalLine(`> Fatal: ${message}`)
        setErrorMsg(message)
        setStatus('error')
        onError?.(message)
      }
    }

    boot()
    return () => {
      bootRunRef.current++
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bootNonce, addTerminalLine, handleProcessOutput, onError, onReady, stopDevProcess])

  // Sync source files to WebContainer when files change AFTER initial boot.
  // Skip package.json to avoid reinstall loops.
  // Skip vite.config.js — writing it triggers full Vite restart + dep-scan race.
  // Allow tailwind.config.js and index.html — they change when user edits theme/font in DevSettingsPanel
  // and Vite HMR picks them up without a full restart.
  const SKIP_SYNC_FILES = useMemo(() => new Set([
    'package.json',
    'vite.config.js',
  ]), [])
  const prevNormalizedRef = useRef(normalized)
  useEffect(() => {
    if (status !== 'ready' || !webcontainerInstance) return
    // Skip if normalized reference hasn't actually changed (same deliverable)
    if (prevNormalizedRef.current === normalized) return
    prevNormalizedRef.current = normalized

    async function updateFiles() {
      const wc = webcontainerInstance!
      let synced = 0
      // Enable grace period to suppress transient Vite restart errors
      syncGraceRef.current = true
      try {
        await wc.fs.rm('postcss.config.js')
      } catch {}
      for (const [path, content] of Object.entries(normalized.files)) {
        if (SKIP_SYNC_FILES.has(path)) continue
        const dir = path.split('/').slice(0, -1).join('/')
        if (dir) {
          await wc.spawn('mkdir', ['-p', dir])
        }
        await wc.fs.writeFile(path, content)
        synced++
      }
      if (synced > 0) addTerminalLine(`> Synced ${synced} source files`)
      // Keep grace period for 8s while Vite restarts and stabilizes
      setTimeout(() => { syncGraceRef.current = false }, 8000)
    }

    updateFiles().catch(err => {
      const message = err instanceof Error ? err.message : 'No se pudieron sincronizar los archivos'
      setErrorMsg(message)
      setStatus('error')
    })
  }, [normalized, status, addTerminalLine, SKIP_SYNC_FILES])

  const handleRefresh = () => {
    setIframeLoaded(false)
    if (iframeRef.current && previewUrl) {
      iframeRef.current.src = previewUrl
    }
  }

  const handleRebuild = () => {
    setBootNonce(prev => prev + 1)
  }

  const primaryIssue = detectedIssues[detectedIssues.length - 1] ?? errorMsg

  return (
    <div className="flex h-full flex-col bg-[#0a0a0f]">
      <div className="flex items-center gap-2 border-b border-white/[0.06] bg-[#12121a] px-3 py-1.5 text-xs">
        {status === 'ready' ? (
          <>
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-emerald-400">Running</span>
          </>
        ) : status === 'error' ? (
          <>
            <AlertCircle size={12} className="text-red-400" />
            <span className="text-red-400">Error</span>
          </>
        ) : (
          <>
            <Loader2 size={12} className="animate-spin text-[#a78bfa]" />
            <span className="text-white/50">
              {status === 'booting' && 'Iniciando entorno...'}
              {status === 'installing' && 'Instalando dependencias...'}
              {status === 'starting' && 'Iniciando servidor...'}
            </span>
          </>
        )}

        <div className="flex-1" />

        <button
          onClick={() => setShowTerminal(prev => !prev)}
          className={`rounded p-1 transition-colors ${showTerminal ? 'bg-[#a78bfa]/10 text-[#a78bfa]' : 'text-white/30 hover:text-white/60'}`}
          title="Terminal"
        >
          <Terminal size={14} />
        </button>

        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded p-1 text-white/30 transition-colors hover:text-white/60"
            title="Abrir aparte"
          >
            <ExternalLink size={14} />
          </a>
        )}

        <button
          onClick={handleRefresh}
          disabled={!previewUrl}
          className="rounded p-1 text-white/30 transition-colors hover:text-white/60 disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>

        <button
          onClick={handleRebuild}
          className="rounded p-1 text-white/30 transition-colors hover:text-white/60"
          title="Rebuild"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      <div className="relative flex-1">
        {status !== 'ready' && status !== 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <Loader2 size={32} className="animate-spin text-[#a78bfa]" />
            <div className="text-center">
              <p className="text-sm text-white/60">
                {status === 'booting' && 'Iniciando entorno...'}
                {status === 'installing' && 'Instalando dependencias...'}
                {status === 'starting' && 'Compilando proyecto...'}
              </p>
              <p className="mt-1 text-xs text-white/30">
                {status === 'starting'
                  ? 'En segundos veras el resultado'
                  : 'Esto puede tomar unos segundos'}
              </p>
            </div>
          </div>
        )}

        {status === 'error' && !previewUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
            <AlertCircle size={32} className="text-red-400" />
            <div className="text-center">
              <p className="text-sm font-medium text-red-400">Error al iniciar el proyecto</p>
              <p className="mt-2 max-w-md text-xs text-white/40">{errorMsg}</p>
            </div>
            <button
              onClick={handleRebuild}
              className="inline-flex items-center gap-2 rounded-lg bg-white/[0.08] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/[0.12]"
            >
              <RotateCcw size={14} /> Reintentar entorno
            </button>
          </div>
        )}

        {previewUrl && (
          <>
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className="h-full w-full border-0"
              title="App Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              onLoad={() => setIframeLoaded(true)}
            />

            {!iframeLoaded && status === 'ready' && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0f]/80 backdrop-blur-sm">
                <div className="text-center">
                  <Loader2 size={24} className="mx-auto mb-3 animate-spin text-[#a78bfa]" />
                  <p className="text-sm text-white/70">Cargando preview...</p>
                </div>
              </div>
            )}

            {primaryIssue && (
              <div className="absolute left-4 right-4 top-4 z-10 rounded-xl border border-red-500/30 bg-[#120b0d]/92 px-4 py-3 shadow-2xl backdrop-blur">
                <div className="flex items-start gap-3">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-red-300">Se detecto un problema en el proyecto</p>
                    <p className="mt-1 break-words text-xs text-white/70">{primaryIssue}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => setShowTerminal(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.08] px-2.5 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-white/[0.12]"
                      >
                        <Terminal size={12} /> Ver terminal
                      </button>
                      <button
                        onClick={handleRebuild}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 px-2.5 py-1.5 text-[11px] font-medium text-red-200 transition-colors hover:bg-red-500/20"
                      >
                        <RotateCcw size={12} /> Rebuild
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showTerminal && (
        <div ref={terminalRef} className="h-48 overflow-y-auto border-t border-white/[0.06] bg-[#0a0a0f]">
          <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/[0.06] bg-[#12121a] px-3 py-1.5">
            <Terminal size={12} className="text-white/30" />
            <span className="text-xs text-white/50">Terminal</span>
          </div>
          <pre className="p-3 font-mono text-[11px] leading-relaxed text-white/50">
            {terminalLines.map((line, i) => {
              const lower = line.toLowerCase()
              const className = lower.includes('error')
                ? 'text-red-400'
                : lower.includes('ready')
                  ? 'text-emerald-400'
                  : ''
              return (
                <div key={`${line}-${i}`} className={className}>
                  {line}
                </div>
              )
            })}
          </pre>
        </div>
      )}
    </div>
  )
}

/**
 * Force-inject the Plury bridge script into the running WebContainer's index.html.
 * Call this before enabling edit mode to ensure the visual editor is active
 * even if the project was booted before the bridge script existed.
 */
export async function ensureBridgeScriptInWebContainer(): Promise<boolean> {
  if (!webcontainerInstance) return false
  try {
    const wc = webcontainerInstance
    const currentHtml = await wc.fs.readFile('index.html', 'utf-8')
    if (currentHtml.includes('plury-edit-overlay')) return true // already has it
    const injected = injectBridgeScript(currentHtml)
    await wc.fs.writeFile('index.html', injected)
    // Vite HMR will pick up index.html change and refresh the page
    return true
  } catch (err) {
    console.error('[ensureBridgeScript] Failed:', err)
    return false
  }
}

// Export helper to parse Claude's multi-file output
export function parseMultiFileOutput(output: string): ProjectFile[] {
  const files: ProjectFile[] = []
  const fileRegex = /\/\/ --- FILE: (.+?) ---\n([\s\S]*?)(?=\/\/ --- FILE:|$)/g
  let match: RegExpExecArray | null

  while ((match = fileRegex.exec(output)) !== null) {
    const path = match[1].trim()
    const content = match[2].trim()
    if (path && content) {
      files.push({ path, content })
    }
  }

  return files
}
