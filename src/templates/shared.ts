/**
 * Shared skeleton files for all templates.
 * Provides package.json, vite.config.ts, index.html, postcss/tailwind config, main.tsx, index.css.
 * Also exports sharedUIComponents (components/ui/) for all templates to merge in.
 */
import type { FileSystemTree } from '@webcontainer/api'
import { getUIComponentFiles } from './ui'

/** Spread this into each template's components.directory to include the ui/ library */
export const sharedUIComponents: FileSystemTree = getUIComponentFiles()

export const sharedFiles: FileSystemTree = {
  'package.json': {
    file: {
      contents: JSON.stringify(
        {
          name: 'pluribots-project',
          private: true,
          type: 'module',
          scripts: {
            dev: 'vite',
          },
          dependencies: {
            react: '^18.3.1',
            'react-dom': '^18.3.1',
            'lucide-react': '^0.460.0',
            recharts: '^2.15.0',
          },
          devDependencies: {
            '@vitejs/plugin-react': '^4.3.4',
            vite: '^6.0.0',
            '@types/react': '^18.3.12',
            '@types/react-dom': '^18.3.1',
            tailwindcss: '^4.0.0',
            '@tailwindcss/vite': '^4.0.0',
          },
        },
        null,
        2,
      ),
    },
  },
  'vite.config.ts': {
    file: {
      contents: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
`,
    },
  },
  'index.html': {
    file: {
      contents: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pluribots Project</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    },
  },
  'tsconfig.json': {
    file: {
      contents: JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2020',
            useDefineForClassFields: true,
            lib: ['ES2020', 'DOM', 'DOM.Iterable'],
            module: 'ESNext',
            skipLibCheck: true,
            moduleResolution: 'bundler',
            allowImportingTsExtensions: true,
            isolatedModules: true,
            moduleDetection: 'force',
            noEmit: true,
            jsx: 'react-jsx',
            strict: true,
            noUnusedLocals: false,
            noUnusedParameters: false,
          },
          include: ['src'],
        },
        null,
        2,
      ),
    },
  },
  src: {
    directory: {
      'main.tsx': {
        file: {
          contents: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`,
        },
      },
      'index.css': {
        file: {
          contents: `@import "tailwindcss";

@theme {
  /* Typography */
  --font-sans: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;

  /* Radius scale */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.25rem;

  /* Shadows */
  --shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.03);
  --shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04);
  --shadow-elevated: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
  --shadow-float: 0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.06);
  --shadow-glow-sm: 0 0 10px -2px;
  --shadow-glow-md: 0 0 20px -4px;

  /* Semantic colors — light theme */
  --color-background: #ffffff;
  --color-foreground: #0f172a;
  --color-card: #ffffff;
  --color-card-foreground: #0f172a;
  --color-popover: #ffffff;
  --color-popover-foreground: #0f172a;
  --color-muted: #f1f5f9;
  --color-muted-foreground: #64748b;
  --color-border: #e2e8f0;
  --color-input: #e2e8f0;
  --color-ring: #6366f1;
  --color-primary: #6366f1;
  --color-primary-foreground: #ffffff;
  --color-secondary: #f1f5f9;
  --color-secondary-foreground: #0f172a;
  --color-accent: #f1f5f9;
  --color-accent-foreground: #0f172a;
  --color-destructive: #ef4444;
  --color-destructive-foreground: #ffffff;
  --color-success: #10b981;
  --color-success-foreground: #ffffff;
  --color-warning: #f59e0b;
  --color-warning-foreground: #ffffff;

  /* Animations */
  --animate-fade-in: fade-in 0.3s ease-out;
  --animate-slide-up: slide-up 0.3s ease-out;
  --animate-scale-in: scale-in 0.2s ease-out;
}

/* Dark theme overrides */
.dark {
  --color-background: #0a0a0f;
  --color-foreground: #f1f5f9;
  --color-card: rgba(255, 255, 255, 0.04);
  --color-card-foreground: #f1f5f9;
  --color-popover: #1e1e2e;
  --color-popover-foreground: #f1f5f9;
  --color-muted: rgba(255, 255, 255, 0.06);
  --color-muted-foreground: #94a3b8;
  --color-border: rgba(255, 255, 255, 0.08);
  --color-input: rgba(255, 255, 255, 0.08);
  --color-ring: #818cf8;
  --color-primary: #6366f1;
  --color-primary-foreground: #ffffff;
  --color-secondary: rgba(255, 255, 255, 0.06);
  --color-secondary-foreground: #e2e8f0;
  --color-accent: rgba(255, 255, 255, 0.06);
  --color-accent-foreground: #e2e8f0;
  --color-destructive: #ef4444;
  --color-destructive-foreground: #ffffff;
  --color-success: #10b981;
  --color-success-foreground: #ffffff;
  --color-warning: #f59e0b;
  --color-warning-foreground: #ffffff;

  color-scheme: dark;
}

.dark body,
body.dark {
  background: linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 50%, #0a0a0f 100%);
}

/* Dark scrollbar */
.dark ::-webkit-scrollbar-thumb { background: #334155; }
.dark ::-webkit-scrollbar-thumb:hover { background: #475569; }

/* Dark select/option elements */
.dark select,
.dark option {
  background-color: #1e1e2e;
  color: #f1f5f9;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slide-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Base styles */
body {
  font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--color-foreground);
  background: var(--color-background);
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
`,
        },
      },
    },
  },
}
