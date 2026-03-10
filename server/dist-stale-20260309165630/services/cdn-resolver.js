// Known packages with reliable UMD/global builds
const CDN_MAP = {
    // Already loaded in base template
    'react': { cdnUrl: '', globalName: 'React' },
    'react-dom': { cdnUrl: '', globalName: 'ReactDOM' },
    'react-dom/client': { cdnUrl: '', globalName: 'ReactDOM' },
    'lucide-react': { cdnUrl: '', globalName: 'lucideReact' },
    // Charts
    'recharts': {
        cdnUrl: 'https://unpkg.com/recharts/umd/Recharts.min.js',
        globalName: 'Recharts',
    },
    'chart.js': {
        cdnUrl: 'https://cdn.jsdelivr.net/npm/chart.js/dist/chart.umd.min.js',
        globalName: 'Chart',
    },
    'chart.js/auto': {
        cdnUrl: 'https://cdn.jsdelivr.net/npm/chart.js/dist/chart.umd.min.js',
        globalName: 'Chart',
    },
    'react-chartjs-2': {
        cdnUrl: 'https://cdn.jsdelivr.net/npm/react-chartjs-2@5/dist/index.umd.min.js',
        globalName: 'ReactChartjs2',
    },
    // Router
    'react-router-dom': {
        cdnUrl: 'https://unpkg.com/react-router-dom@6/dist/umd/react-router-dom.production.min.js',
        globalName: 'ReactRouterDOM',
    },
    'react-router': {
        cdnUrl: 'https://unpkg.com/react-router@6/dist/umd/react-router.production.min.js',
        globalName: 'ReactRouter',
    },
    // HTTP
    'axios': {
        cdnUrl: 'https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js',
        globalName: 'axios',
    },
    // Date utilities
    'date-fns': {
        cdnUrl: 'https://cdn.jsdelivr.net/npm/date-fns@3/cdn.min.js',
        globalName: 'dateFns',
    },
    'dayjs': {
        cdnUrl: 'https://cdn.jsdelivr.net/npm/dayjs/dayjs.min.js',
        globalName: 'dayjs',
    },
    'moment': {
        cdnUrl: 'https://cdn.jsdelivr.net/npm/moment/min/moment.min.js',
        globalName: 'moment',
    },
    // Animation
    'framer-motion': {
        cdnUrl: 'https://cdn.jsdelivr.net/npm/framer-motion@11/dist/framer-motion.js',
        globalName: 'FramerMotion',
    },
    // State management
    'zustand': {
        cdnUrl: 'https://cdn.jsdelivr.net/npm/zustand@4/umd/index.production.js',
        globalName: 'zustand',
    },
    // Form
    'react-hook-form': {
        cdnUrl: 'https://cdn.jsdelivr.net/npm/react-hook-form/dist/index.umd.min.js',
        globalName: 'ReactHookForm',
    },
    // Markdown
    'react-markdown': {
        cdnUrl: 'https://cdn.jsdelivr.net/npm/react-markdown@9/+esm',
        globalName: 'ReactMarkdown',
    },
    // UUID
    'uuid': {
        cdnUrl: 'https://cdn.jsdelivr.net/npm/uuid@9/dist/umd/uuid.min.js',
        globalName: 'uuid',
    },
    // Supabase
    '@supabase/supabase-js': {
        cdnUrl: 'https://esm.sh/@supabase/supabase-js@2',
        globalName: 'supabase',
    },
    // TanStack Query
    '@tanstack/react-query': {
        cdnUrl: 'https://cdn.jsdelivr.net/npm/@tanstack/react-query/build/umd/index.production.js',
        globalName: 'ReactQuery',
    },
    // Validation
    'zod': {
        cdnUrl: 'https://cdn.jsdelivr.net/npm/zod/lib/index.umd.js',
        globalName: 'Zod',
    },
    // Toasts
    'sonner': {
        cdnUrl: 'https://cdn.jsdelivr.net/npm/sonner/dist/index.umd.js',
        globalName: 'Sonner',
    },
    'react-hot-toast': {
        cdnUrl: 'https://cdn.jsdelivr.net/npm/react-hot-toast/dist/index.umd.js',
        globalName: 'reactHotToast',
    },
};
// Tiny utility packages with inline polyfill implementations
const INLINE_UTILS = {
    'clsx': `function clsx(){for(var i=0,tmp,x,str='';i<arguments.length;i++){if(tmp=arguments[i]){if(typeof tmp==='string'){x=tmp}else if(Array.isArray(tmp)){x=clsx.apply(null,tmp)}else if(typeof tmp==='object'){x='';for(var k in tmp)if(tmp[k])x+=(x&&' ')+k}if(x)str+=(str&&' ')+x}}return str}`,
    'tailwind-merge': `function twMerge(){return Array.from(arguments).flat(Infinity).filter(Boolean).join(' ')}`,
    'class-variance-authority': `function cva(base,config){return function(props){var r=base||'';if(config&&config.variants&&props){Object.keys(config.variants).forEach(function(k){var v=props[k]||((config.defaultVariants||{})[k]);if(v&&config.variants[k]&&config.variants[k][v])r+=' '+config.variants[k][v]})}return r}}`,
    '@radix-ui/react-slot': `const Slot = React.forwardRef(function(props, ref) { var children = props.children, rest = Object.assign({}, props); delete rest.children; if (React.isValidElement(children)) { return React.cloneElement(children, Object.assign({}, rest, { ref: ref })); } return React.createElement('span', Object.assign({}, rest, { ref: ref }), children); });`,
};
/**
 * Resolve package.json dependencies to CDN scripts and global mappings
 */
export function resolveCDNDependencies(artifact) {
    const pkgFile = artifact.files.find(f => f.filePath === 'package.json');
    if (!pkgFile)
        return { scriptTags: [], inlineSetup: '', globalMap: {} };
    let deps = {};
    try {
        const pkg = JSON.parse(pkgFile.content);
        deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    }
    catch {
        return { scriptTags: [], inlineSetup: '', globalMap: {} };
    }
    const scriptTags = [];
    const inlineCode = [];
    const globalMap = {};
    for (const pkg of Object.keys(deps)) {
        // Check CDN map
        if (CDN_MAP[pkg]) {
            const info = CDN_MAP[pkg];
            if (info.cdnUrl) {
                scriptTags.push(`<script src="${info.cdnUrl}"><\/script>`);
            }
            globalMap[pkg] = info.globalName;
            continue;
        }
        // Check inline utils
        if (INLINE_UTILS[pkg]) {
            inlineCode.push(INLINE_UTILS[pkg]);
            continue;
        }
        // Skip TypeScript/build tools (not needed at runtime)
        if (['typescript', 'vite', '@vitejs/plugin-react', 'tailwindcss', 'postcss', 'autoprefixer',
            '@types/react', '@types/react-dom', '@types/node', 'eslint', 'prettier'].includes(pkg)) {
            continue;
        }
        console.log(`[CDN] Package "${pkg}" not available in preview`);
    }
    return {
        scriptTags,
        inlineSetup: inlineCode.join('\n'),
        globalMap,
    };
}
/**
 * Also scan source code for imports of packages not in package.json
 * (in case Logic didn't generate a package.json or forgot a dep)
 */
export function detectImportedPackages(files) {
    const packages = new Set();
    for (const file of files) {
        if (!/\.(tsx?|jsx?)$/.test(file.filePath))
            continue;
        const importMatches = file.content.matchAll(/^import\s+.+?\s+from\s+['"]([^./][^'"]*)['"]/gm);
        for (const match of importMatches) {
            // Get the package name (handle scoped packages like @radix-ui/react-slot)
            const source = match[1];
            const pkg = source.startsWith('@')
                ? source.split('/').slice(0, 2).join('/')
                : source.split('/')[0];
            packages.add(pkg);
        }
    }
    return [...packages];
}
/**
 * Transform external imports to use CDN globals.
 * Relative imports (./xxx, ../xxx) are stripped (they're inlined).
 */
export function transformImportsForCDN(code, globalMap) {
    return code.replace(/^import\s+(.+?)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/gm, (_match, importClause, source) => {
        // Relative imports — strip (files are inlined)
        if (source.startsWith('.') || source.startsWith('/')) {
            return '';
        }
        // Type-only imports — strip
        if (importClause.startsWith('type ') || importClause.startsWith('type{')) {
            return '';
        }
        // Find the package name (handle @scoped/packages and subpaths)
        const pkgName = source.startsWith('@')
            ? source.split('/').slice(0, 2).join('/')
            : source.split('/')[0];
        const globalName = globalMap[source] || globalMap[pkgName];
        if (!globalName)
            return ''; // Unknown — strip
        const g = `(window.${globalName} || {})`;
        // import { X, Y } from 'pkg'
        const namedMatch = importClause.match(/^\{(.+)\}$/);
        if (namedMatch) {
            return `const { ${namedMatch[1].replace(/\s+as\s+/g, ': ')} } = ${g};`;
        }
        // import X, { Y, Z } from 'pkg'
        const mixedMatch = importClause.match(/^(\w+)\s*,\s*\{(.+)\}$/);
        if (mixedMatch) {
            return `const ${mixedMatch[1].trim()} = ${g}.default || ${g};\nconst { ${mixedMatch[2].trim().replace(/\s+as\s+/g, ': ')} } = ${g};`;
        }
        // import * as X from 'pkg'
        const nsMatch = importClause.match(/^\*\s+as\s+(\w+)$/);
        if (nsMatch) {
            return `const ${nsMatch[1]} = ${g};`;
        }
        // import X from 'pkg' (default)
        const defaultMatch = importClause.match(/^(\w+)$/);
        if (defaultMatch) {
            return `const ${defaultMatch[1]} = ${g}.default || ${g};`;
        }
        return ''; // Fallback: strip
    });
}
//# sourceMappingURL=cdn-resolver.js.map