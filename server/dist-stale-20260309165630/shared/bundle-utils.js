// ─── Shared constants for HTML bundlers (artifact-parser.ts + clientBundle.ts) ───
// Pure strings, no Node/React dependencies.
export const DESIGN_SYSTEM_CSS = `
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
`;
export const TAILWIND_CONFIG_SCRIPT = `<script>
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
<\/script>`;
export const INLINE_UTILS_CODE = `
  function clsx(){for(var i=0,tmp,x,str='';i<arguments.length;i++){if(tmp=arguments[i]){if(typeof tmp==='string'){x=tmp}else if(Array.isArray(tmp)){x=clsx.apply(null,tmp)}else if(typeof tmp==='object'){x='';for(var k in tmp)if(tmp[k])x+=(x&&' ')+k}if(x)str+=(str&&' ')+x}}return str}
  window.__clsx={default:clsx,clsx:clsx};
  function twMerge(){return Array.from(arguments).flat(Infinity).filter(Boolean).join(' ')}
  window.__twMerge={twMerge:twMerge,default:twMerge};
  function cva(base,config){return function(props){var r=base||'';if(config&&config.variants&&props){Object.keys(config.variants).forEach(function(k){var v=props[k]||((config.defaultVariants||{})[k]);if(v&&config.variants[k]&&config.variants[k][v])r+=' '+config.variants[k][v]})}return r}}
  window.__cva={cva:cva,default:cva};
  const Slot = React.forwardRef(function(props, ref) { var children = props.children, rest = Object.assign({}, props); delete rest.children; if (React.isValidElement(children)) { return React.cloneElement(children, Object.assign({}, rest, { ref: ref })); } return React.createElement('span', Object.assign({}, rest, { ref: ref }), children); });
  window.__radixSlot={Slot:Slot,default:Slot};
`;
export const ERROR_OVERLAY_SCRIPT = `<script>
    (function(){
      var errors=[];
      function showError(msg,line,type){
        var s=String(msg);
        if(s.length>500)s=s.substring(0,500)+'...';
        errors.push({error:s,line:line||0,type:type||'runtime'});
        try{window.parent.postMessage({type:'iframe-error',error:s,line:line||0,errorType:type||'runtime'},'*');}catch(e){}
        if(!document.body)return;
        var d=document.getElementById('__error_overlay');
        if(!d){d=document.createElement('div');d.id='__error_overlay';
          d.style.cssText='position:fixed;bottom:0;left:0;right:0;max-height:40%;overflow:auto;background:rgba(220,38,38,0.95);color:#fff;font-family:monospace;font-size:13px;padding:12px 16px;z-index:999999;backdrop-filter:blur(4px);border-top:2px solid #f87171;';
          document.body.appendChild(d);}
        var label=type==='compile'||type==='babel'?'Compilation':type==='cdn'?'CDN Load':'Runtime';
        d.innerHTML+='<div style="margin-bottom:6px"><b>'+label+' Error'+(line?' (line '+line+')':'')+':</b> '+s.replace(/</g,'&lt;')+'</div>';
      }
      window.onerror=function(msg,url,line){showError(msg,line,'runtime')};
      window.onunhandledrejection=function(e){showError(e.reason,0,'runtime')};
      var origError=console.error,origWarn=console.warn;
      console.error=function(){origError.apply(console,arguments);try{window.parent.postMessage({type:'iframe-console',level:'error',args:Array.from(arguments).map(String)},'*');}catch(e){}};
      console.warn=function(){origWarn.apply(console,arguments);try{window.parent.postMessage({type:'iframe-console',level:'warn',args:Array.from(arguments).map(String)},'*');}catch(e){}};
      window.__showError=showError;
    })();
  <\/script>`;
export const ERROR_BOUNDARY_CODE = `
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
    }`;
export const REACT_HOOKS_DESTRUCTURE = `var { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext, useReducer, useLayoutEffect, forwardRef, lazy, Suspense, Fragment, memo, startTransition, createElement, cloneElement, isValidElement, Children, Component, PureComponent, createRef, StrictMode } = React;`;
export const LUCIDE_SETUP = `var Icons = window.LucideReact || {};`;
//# sourceMappingURL=bundle-utils.js.map