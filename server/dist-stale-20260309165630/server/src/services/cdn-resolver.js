// ─── esm.sh + Import Maps based Package Resolution ───
// Any npm package works automatically via esm.sh CDN + browser import maps.
// Polyfills provide lightweight overrides for common packages.
// Packages that do NOT have UMD builds — provide inline polyfill implementations
// These are lightweight replacements that cover the most common API surface
export const INLINE_POLYFILL_PACKAGES = {
    // framer-motion — globalName: FramerMotion — provide motion.div etc as simple pass-through wrappers
    'framer-motion': `(function(){
    var handler={get:function(_,tag){return function(props){
      var p=Object.assign({},props);delete p.initial;delete p.animate;delete p.exit;delete p.transition;delete p.whileHover;delete p.whileTap;delete p.whileInView;delete p.variants;delete p.layout;
      return React.createElement(tag,p);
    }}};
    var motion=new Proxy({},handler);
    var AnimatePresence=function(p){return React.createElement(React.Fragment,null,p.children)};
    var LazyMotion=function(p){return React.createElement(React.Fragment,null,p.children)};
    var domAnimation=null;
    window.FramerMotion={motion:motion,AnimatePresence:AnimatePresence,LazyMotion:LazyMotion,domAnimation:domAnimation,useAnimation:function(){return{start:function(){}}},useInView:function(){return false},useScroll:function(){return{scrollY:{get:function(){return 0}}}},useTransform:function(v){return v},useMotionValue:function(v){return{get:function(){return v},set:function(){}}}};
  })()`,
    // sonner — provide toast function with visible DOM notifications
    'sonner': `(function(){
    var containerId='__sonner_container';
    function getContainer(){
      var c=document.getElementById(containerId);
      if(!c){c=document.createElement('div');c.id=containerId;c.style.cssText='position:fixed;bottom:16px;right:16px;z-index:999999;display:flex;flex-direction:column;gap:8px;max-width:360px;pointer-events:none;';document.body.appendChild(c);}
      return c;
    }
    function showToast(msg,type){
      var c=getContainer();
      var t=document.createElement('div');t.style.cssText='pointer-events:auto;padding:12px 16px;border-radius:8px;font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.4;box-shadow:0 4px 12px rgba(0,0,0,0.15);color:#fff;opacity:0;transform:translateY(8px);transition:opacity 0.3s,transform 0.3s;';
      var colors={success:'#16a34a',error:'#dc2626',info:'#2563eb',warning:'#d97706',default:'#18181b'};
      t.style.background=colors[type]||colors.default;
      t.textContent=String(msg);
      c.appendChild(t);
      requestAnimationFrame(function(){t.style.opacity='1';t.style.transform='translateY(0)';});
      setTimeout(function(){t.style.opacity='0';t.style.transform='translateY(8px)';setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},300);},3000);
    }
    function Toaster(){
      React.useEffect(function(){getContainer();return function(){var c=document.getElementById(containerId);if(c&&c.parentNode)c.parentNode.removeChild(c);};},[]);
      return null;
    }
    function toast(msg){showToast(msg,'default');}
    toast.success=function(m){showToast(m,'success');};
    toast.error=function(m){showToast(m,'error');};
    toast.info=function(m){showToast(m,'info');};
    toast.warning=function(m){showToast(m,'warning');};
    toast.dismiss=function(){var c=document.getElementById(containerId);if(c)c.innerHTML='';};
    window.Sonner={Toaster:Toaster,toast:toast};
  })()`,
    // react-hot-toast — provide a simple toast function
    'react-hot-toast': `(function(){
    function Toaster(){return null;}
    function toast(msg){console.log('[toast]',msg);return '';}
    toast.success=function(m){console.log('[toast:success]',m);return '';};
    toast.error=function(m){console.log('[toast:error]',m);return '';};
    toast.loading=function(m){console.log('[toast:loading]',m);return '';};
    toast.dismiss=function(){};
    toast.remove=function(){};
    window.reactHotToast={default:toast,Toaster:Toaster};
  })()`,
    // react-markdown — mini markdown parser with basic formatting
    'react-markdown': `(function(){
    function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
    function parseMd(text){
      var html=esc(text);
      html=html.replace(/^### (.+)$/gm,'<h3 style="font-size:1.17em;font-weight:700;margin:12px 0 4px">$1</h3>');
      html=html.replace(/^## (.+)$/gm,'<h2 style="font-size:1.3em;font-weight:700;margin:16px 0 6px">$1</h2>');
      html=html.replace(/^# (.+)$/gm,'<h1 style="font-size:1.5em;font-weight:700;margin:20px 0 8px">$1</h1>');
      html=html.replace(/\\*\\*(.+?)\\*\\*/g,'<strong>$1</strong>');
      html=html.replace(/\\*(.+?)\\*/g,'<em>$1</em>');
      html=html.replace(/\`([^\`]+)\`/g,'<code style="background:rgba(0,0,0,0.06);padding:2px 5px;border-radius:3px;font-size:0.9em">$1</code>');
      html=html.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g,'<a href="$2" target="_blank" rel="noopener" style="color:#2563eb;text-decoration:underline">$1</a>');
      html=html.replace(/^[-*] (.+)$/gm,'<li style="margin-left:20px;list-style:disc">$1</li>');
      html=html.replace(/(<li[^>]*>.*<\\/li>\\n?)+/g,'<ul>$&</ul>');
      html=html.replace(/^(?:---|\\*\\*\\*|___)\\s*$/gm,'<hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0">');
      html=html.replace(/\\n/g,'<br>');
      return html;
    }
    function ReactMarkdown(props){
      var text=props.children||'';
      return React.createElement('div',{className:props.className,dangerouslySetInnerHTML:{__html:parseMd(text)}});
    }
    window.ReactMarkdown={default:ReactMarkdown};
  })()`,
    // react-chartjs-2 — provide stub components (chart.js itself is loaded via CDN)
    'react-chartjs-2': `(function(){
    function makeChart(type){return function(props){
      var ref=React.useRef(null);
      React.useEffect(function(){
        if(!ref.current||!window.Chart)return;
        var ctx=ref.current.getContext('2d');
        var chart=new window.Chart(ctx,{type:type,data:props.data||{},options:props.options||{}});
        return function(){chart.destroy();};
      },[props.data,props.options]);
      return React.createElement('canvas',{ref:ref,style:{width:'100%',height:props.height||300}});
    }}
    window.ReactChartjs2={Line:makeChart('line'),Bar:makeChart('bar'),Pie:makeChart('pie'),Doughnut:makeChart('doughnut'),Radar:makeChart('radar'),Scatter:makeChart('scatter'),Bubble:makeChart('bubble')};
  })()`,
    // zustand — simple store with React hook
    'zustand': `(function(){
    function create(init){var state={};var ls=new Set();
    function setState(p,r){var n=typeof p==='function'?p(state):p;state=r?n:Object.assign({},state,n);ls.forEach(function(l){l(state);});}
    function getState(){return state;}function subscribe(l){ls.add(l);return function(){ls.delete(l);};}
    var api={setState:setState,getState:getState,subscribe:subscribe};
    state=typeof init==='function'?init(setState,getState,api):init;
    function useStore(sel){var _s=React.useState(0),f=_s[1];React.useEffect(function(){return subscribe(function(){f(function(c){return c+1;});});},[]);return sel?sel(state):state;}
    useStore.getState=getState;useStore.setState=setState;useStore.subscribe=subscribe;return useStore;}
    window.zustand={create:create,default:create};
  })()`,
    // @supabase/supabase-js — lightweight Supabase REST client polyfill
    '@supabase/supabase-js': `(function(){
    function createClient(url,key){
      var hdrs={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json','Prefer':'return=representation'};
      function from(table){
        var q={_f:[],_s:'*',_m:'GET',_b:null,_o:[],_single:false};
        q.select=function(c){q._s=c||'*';return q;};
        q.insert=function(d){q._m='POST';q._b=Array.isArray(d)?d:[d];return q;};
        q.update=function(d){q._m='PATCH';q._b=d;return q;};
        q.delete=function(){q._m='DELETE';return q;};
        q.upsert=function(d){q._m='POST';q._b=Array.isArray(d)?d:[d];q._upsert=true;return q;};
        q.eq=function(c,v){q._f.push(c+'=eq.'+v);return q;};
        q.neq=function(c,v){q._f.push(c+'=neq.'+v);return q;};
        q.gt=function(c,v){q._f.push(c+'=gt.'+v);return q;};
        q.lt=function(c,v){q._f.push(c+'=lt.'+v);return q;};
        q.gte=function(c,v){q._f.push(c+'=gte.'+v);return q;};
        q.lte=function(c,v){q._f.push(c+'=lte.'+v);return q;};
        q.like=function(c,v){q._f.push(c+'=like.'+v);return q;};
        q.in=function(c,v){q._f.push(c+'=in.('+v.join(',')+')');return q;};
        q.is=function(c,v){q._f.push(c+'=is.'+v);return q;};
        q.order=function(c,opts){q._o.push(c+'.'+(opts&&opts.ascending===false?'desc':'asc'));return q;};
        q.limit=function(n){q._f.push('limit='+n);return q;};
        q.single=function(){q._single=true;return q;};
        q.maybeSingle=function(){q._single=true;return q;};
        q.then=function(resolve,reject){
          var u=url+'/rest/v1/'+table+'?select='+encodeURIComponent(q._s);
          q._f.forEach(function(f){u+='&'+f;});
          if(q._o.length)u+='&order='+q._o.join(',');
          var h=Object.assign({},hdrs);
          if(q._upsert)h['Prefer']='resolution=merge-duplicates,return=representation';
          fetch(u,{method:q._m,headers:h,body:q._b?JSON.stringify(q._b):undefined})
          .then(function(r){return r.json().then(function(d){return{data:q._single?(Array.isArray(d)?d[0]:d):d,error:r.ok?null:{message:'Error '+r.status}}})})
          .then(resolve).catch(function(e){resolve({data:null,error:{message:String(e)}});});
        };
        return q;
      }
      var auth={_session:null,_listeners:[],
        signUp:function(c){return fetch(url+'/auth/v1/signup',{method:'POST',headers:hdrs,body:JSON.stringify(c)}).then(function(r){return r.json()}).then(function(d){auth._session=d;return{data:d,error:null}}).catch(function(e){return{data:null,error:{message:String(e)}}});},
        signInWithPassword:function(c){return fetch(url+'/auth/v1/token?grant_type=password',{method:'POST',headers:hdrs,body:JSON.stringify(c)}).then(function(r){return r.json()}).then(function(d){auth._session=d;auth._listeners.forEach(function(l){l('SIGNED_IN',d)});return{data:d,error:null}}).catch(function(e){return{data:null,error:{message:String(e)}}});},
        signOut:function(){auth._session=null;auth._listeners.forEach(function(l){l('SIGNED_OUT',null)});return Promise.resolve({error:null});},
        getSession:function(){return Promise.resolve({data:{session:auth._session},error:null});},
        getUser:function(){return Promise.resolve({data:{user:auth._session&&auth._session.user||null},error:null});},
        onAuthStateChange:function(cb){auth._listeners.push(cb);return{data:{subscription:{unsubscribe:function(){auth._listeners=auth._listeners.filter(function(l){return l!==cb});}}}};},
      };
      var storage={from:function(bucket){return{
        upload:function(p,f){return Promise.resolve({data:{path:p},error:null});},
        download:function(p){return Promise.resolve({data:null,error:null});},
        getPublicUrl:function(p){return{data:{publicUrl:url+'/storage/v1/object/public/'+bucket+'/'+p}};},
        remove:function(paths){return Promise.resolve({data:null,error:null});},
        list:function(p){return Promise.resolve({data:[],error:null});},
      };}};
      return{from:from,auth:auth,storage:storage,rpc:function(fn,params){return fetch(url+'/rest/v1/rpc/'+fn,{method:'POST',headers:hdrs,body:JSON.stringify(params||{})}).then(function(r){return r.json()}).then(function(d){return{data:d,error:null}}).catch(function(e){return{data:null,error:{message:String(e)}}});}};
    }
    window.supabase={createClient:createClient};
  })()`,
    // react-hook-form — basic useForm polyfill
    'react-hook-form': `(function(){
    function useForm(cfg){
      var dv=(cfg&&cfg.defaultValues)||{};
      var _s=React.useState(function(){return Object.assign({},dv)});var vals=_s[0],setVals=_s[1];
      var _e=React.useState({});var errs=_e[0];
      function register(name){return{name:name,value:vals[name]!=null?vals[name]:'',onChange:function(e){var v=e&&e.target?e.target.value:e;setVals(function(p){var n=Object.assign({},p);n[name]=v;return n;});},onBlur:function(){},ref:function(){}};}
      function handleSubmit(onValid){return function(e){if(e&&e.preventDefault)e.preventDefault();onValid(vals);};}
      return{register:register,handleSubmit:handleSubmit,formState:{errors:errs,isSubmitting:false,isValid:true,isDirty:false},
        setValue:function(n,v){setVals(function(p){var o=Object.assign({},p);o[n]=v;return o;});},
        watch:function(n){return n?vals[n]:vals;},reset:function(v){setVals(v||Object.assign({},dv));},
        getValues:function(){return vals;},control:{},trigger:function(){return Promise.resolve(true);},clearErrors:function(){}};
    }
    function Controller(p){var field={value:'',onChange:function(){},onBlur:function(){},name:p.name||'',ref:function(){}};return p.render?p.render({field:field,fieldState:{error:null},formState:{errors:{}}}):null;}
    window.ReactHookForm={useForm:useForm,Controller:Controller,default:useForm,useFormContext:function(){return useForm();},useWatch:function(){return '';},useFieldArray:function(){return{fields:[],append:function(){},remove:function(){},move:function(){}};}};
  })()`,
    // @tanstack/react-query — basic useQuery/useMutation polyfill
    '@tanstack/react-query': `(function(){
    var cache={};
    function useQuery(opts){
      var key=JSON.stringify(opts.queryKey||[]);
      var _s=React.useState({data:cache[key]||null,error:null,isLoading:!cache[key]});var st=_s[0],setSt=_s[1];
      React.useEffect(function(){if(!opts.queryFn||cache[key]){if(cache[key])setSt({data:cache[key],error:null,isLoading:false});return;}
        Promise.resolve(opts.queryFn()).then(function(d){cache[key]=d;setSt({data:d,error:null,isLoading:false});}).catch(function(e){setSt({data:null,error:e,isLoading:false});});},[key]);
      return Object.assign({},st,{isError:!!st.error,isFetching:st.isLoading,isSuccess:!!st.data&&!st.isLoading,refetch:function(){if(opts.queryFn)Promise.resolve(opts.queryFn()).then(function(d){cache[key]=d;setSt({data:d,error:null,isLoading:false});});}});
    }
    function useMutation(opts){
      var _s=React.useState(false);var loading=_s[0],setL=_s[1];
      var fn=typeof opts==='function'?opts:opts.mutationFn;
      function mutate(v){setL(true);Promise.resolve(fn(v)).then(function(d){setL(false);if(opts.onSuccess)opts.onSuccess(d,v);}).catch(function(e){setL(false);if(opts.onError)opts.onError(e,v);});}
      return{mutate:mutate,mutateAsync:function(v){return fn(v);},isLoading:loading,isPending:loading,isSuccess:false,reset:function(){}};
    }
    function QC(){this.c=cache;}QC.prototype.invalidateQueries=function(){};QC.prototype.setQueryData=function(k,d){cache[JSON.stringify(k)]=typeof d==='function'?d(cache[JSON.stringify(k)]):d;};QC.prototype.getQueryData=function(k){return cache[JSON.stringify(k)];};
    function QCP(p){return React.createElement(React.Fragment,null,p.children);}
    window.ReactQuery={useQuery:useQuery,useMutation:useMutation,QueryClient:QC,QueryClientProvider:QCP,useQueryClient:function(){return new QC();}};
  })()`,
    // @gsap/react — useGSAP hook polyfill
    '@gsap/react': `(function(){
    function useGSAP(cb, deps) {
      var ref = React.useRef(null);
      React.useEffect(function() {
        if (window.gsap && cb) { var ctx = window.gsap.context(cb, ref.current); return function(){ ctx.revert(); }; }
      }, deps || []);
      return { contextSafe: function(fn){ return fn; }, context: null };
    }
    window.__gsapReact = { useGSAP: useGSAP };
  })()`,
    // zod — chainable schema stubs (parse returns input as-is)
    'zod': `(function(){
    function S(){}var p=S.prototype;
    p.parse=function(v){return v;};p.safeParse=function(v){return{success:true,data:v};};
    ['optional','nullable','nullish','default','describe','catch','brand','pipe','readonly','transform','refine','superRefine','min','max','length','email','url','uuid','cuid','regex','trim','toLowerCase','toUpperCase','startsWith','endsWith','includes','datetime','ip','positive','negative','nonnegative','nonpositive','int','finite','safe','multipleOf','gte','lte','gt','lt','nonempty','extend','pick','omit','partial','required','passthrough','strict','strip','merge','and','or','array'].forEach(function(m){p[m]=function(){return this;};});
    p.shape={};p._def={};
    function mk(){return new S();}
    var z={string:mk,number:mk,boolean:mk,date:mk,bigint:mk,any:mk,unknown:mk,never:mk,void:mk,null:mk,undefined:mk,literal:mk,
      object:function(s){var o=mk();o.shape=s||{};return o;},array:function(){return mk();},tuple:function(){return mk();},
      enum:function(){return mk();},nativeEnum:function(){return mk();},union:function(){return mk();},discriminatedUnion:function(){return mk();},
      intersection:function(){return mk();},record:function(){return mk();},map:function(){return mk();},set:function(){return mk();},
      lazy:function(fn){return fn();},custom:function(){return mk();},instanceof:function(){return mk();},promise:function(){return mk();},
      coerce:{string:mk,number:mk,boolean:mk,date:mk,bigint:mk}};
    window.Zod={z:z,default:z};for(var k in z)window.Zod[k]=z[k];
  })()`,
};
// Map of polyfill package → window global name
export const POLYFILL_GLOBALS = {
    'framer-motion': 'FramerMotion',
    'sonner': 'Sonner',
    'react-hot-toast': 'reactHotToast',
    'react-markdown': 'ReactMarkdown',
    'react-chartjs-2': 'ReactChartjs2',
    'zustand': 'zustand',
    '@supabase/supabase-js': 'supabase',
    'react-hook-form': 'ReactHookForm',
    '@tanstack/react-query': 'ReactQuery',
    'zod': 'Zod',
    '@gsap/react': '__gsapReact',
};
// Tiny utility packages with inline polyfill implementations
// Each entry: { code: inline JS, globalName: name for import resolution }
export const INLINE_UTILS = {
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
};
// Build tools and types that are never needed at runtime
const SKIP_PACKAGES = new Set([
    'typescript', 'vite', '@vitejs/plugin-react', 'tailwindcss', 'postcss', 'autoprefixer',
    '@types/react', '@types/react-dom', '@types/node', 'eslint', 'prettier',
    '@eslint/js', 'globals', 'typescript-eslint', '@vitejs/plugin-react-swc',
]);
// Packages loaded synchronously in the HTML template (not via import map)
const BASE_PACKAGES = new Set([
    'react', 'react-dom', 'react-dom/client', 'lucide-react',
]);
/**
 * Automatic global name mapping: converts package name to PascalCase/camelCase global.
 * Handles scoped packages (@scope/name → Name), subpaths (gsap/ScrollTrigger → ScrollTrigger).
 */
function autoGlobalName(pkg) {
    // Known overrides for common packages
    const KNOWN_GLOBALS = {
        'react': 'React',
        'react-dom': 'ReactDOM',
        'react-dom/client': 'ReactDOM',
        'lucide-react': 'lucideReact',
        'recharts': 'Recharts',
        'chart.js': 'Chart',
        'chart.js/auto': 'Chart',
        'react-router-dom': 'ReactRouterDOM',
        'react-router': 'ReactRouter',
        'axios': 'axios',
        'lodash': '_',
        'date-fns': 'dateFns',
        'dayjs': 'dayjs',
        'moment': 'moment',
        'uuid': 'uuid',
        'gsap': 'gsap',
        'gsap/ScrollTrigger': 'ScrollTrigger',
        'gsap/Flip': 'Flip',
        'gsap/Draggable': 'Draggable',
        'gsap/MotionPathPlugin': 'MotionPathPlugin',
        'gsap/TextPlugin': 'TextPlugin',
        'd3': 'd3',
        'three': 'THREE',
        'lodash-es': '_',
        'lodash/debounce': 'lodashDebounce',
        'lodash/throttle': 'lodashThrottle',
        'lodash/get': 'lodashGet',
        'lodash/cloneDeep': 'lodashCloneDeep',
        'date-fns/format': 'dateFnsFormat',
        'date-fns/parseISO': 'dateFnsParseISO',
        'date-fns/formatDistance': 'dateFnsFormatDistance',
    };
    if (KNOWN_GLOBALS[pkg])
        return KNOWN_GLOBALS[pkg];
    if (POLYFILL_GLOBALS[pkg])
        return POLYFILL_GLOBALS[pkg];
    if (INLINE_UTILS[pkg])
        return INLINE_UTILS[pkg].globalName;
    // For subpaths like 'gsap/Flip', use just the subpath part
    if (pkg.includes('/') && !pkg.startsWith('@')) {
        const sub = pkg.split('/').pop();
        return sub.charAt(0).toUpperCase() + sub.slice(1);
    }
    // For scoped packages like '@dnd-kit/core', use the last segment PascalCased
    if (pkg.startsWith('@')) {
        const name = pkg.split('/')[1] || pkg;
        return name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
    }
    // Convert kebab-case to camelCase: 'my-package' → 'myPackage'
    return pkg.split('-').map((s, i) => i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)).join('');
}
/**
 * Build the global name map for a set of packages.
 * Includes polyfill globals, inline utils, and auto-mapped names.
 */
export function buildGlobalMap(packages) {
    const map = {};
    for (const pkg of packages) {
        if (SKIP_PACKAGES.has(pkg) || pkg.startsWith('@types/'))
            continue;
        map[pkg] = autoGlobalName(pkg);
    }
    return map;
}
/**
 * Build the import map object for <script type="importmap">.
 * Pins react@18.3.1, uses ?external=react,react-dom for React-dependent packages.
 */
export function buildImportMap(packages) {
    const imports = {};
    // Check if any non-polyfill esm.sh packages need React externalized
    const hasEsmPackages = packages.some(pkg => !SKIP_PACKAGES.has(pkg) && !pkg.startsWith('@types/') &&
        !BASE_PACKAGES.has(pkg) && !INLINE_UTILS[pkg] && !INLINE_POLYFILL_PACKAGES[pkg]);
    // React is loaded via UMD <script> tags. esm.sh packages that `import React`
    // need to resolve to the SAME instance — otherwise hooks break ("Invalid hook call").
    // Solution: data: URI shims that re-export window.React / window.ReactDOM.
    if (hasEsmPackages) {
        imports['react'] = "data:text/javascript,const R=window.React;export default R;export const {useState,useEffect,useRef,useCallback,useMemo,createContext,useContext,useReducer,useLayoutEffect,forwardRef,lazy,Suspense,Fragment,memo,startTransition,createElement,cloneElement,isValidElement,Children,Component,PureComponent,createRef,StrictMode}=R;";
        imports['react-dom'] = "data:text/javascript,export default window.ReactDOM;export const {createRoot,hydrateRoot,flushSync}=window.ReactDOM;";
        imports['react-dom/client'] = "data:text/javascript,export default window.ReactDOM;export const {createRoot,hydrateRoot}=window.ReactDOM;";
        imports['react/jsx-runtime'] = "data:text/javascript,const R=window.React;export const jsx=R.createElement;export const jsxs=R.createElement;export const jsxDEV=R.createElement;export const Fragment=R.Fragment;";
    }
    // Packages that depend on React — need ?external=react,react-dom so they
    // use the shim imports above instead of bundling their own React copy
    const REACT_DEPENDENT = new Set([
        'recharts', 'react-router-dom', 'react-router', '@dnd-kit/core', '@dnd-kit/sortable',
        'react-beautiful-dnd', 'react-select', 'react-table', '@tanstack/react-table',
        '@tanstack/react-query', 'react-hook-form', 'react-hot-toast', 'react-markdown',
        'react-chartjs-2', '@radix-ui/react-slot', '@gsap/react',
    ]);
    for (const pkg of packages) {
        if (SKIP_PACKAGES.has(pkg) || pkg.startsWith('@types/'))
            continue;
        if (BASE_PACKAGES.has(pkg))
            continue;
        if (INLINE_UTILS[pkg])
            continue;
        // Polyfill packages are loaded synchronously — skip import map
        if (INLINE_POLYFILL_PACKAGES[pkg])
            continue;
        // Only externalize react for packages that actually use it
        const basePkg = pkg.startsWith('@')
            ? pkg.split('/').slice(0, 2).join('/')
            : pkg.split('/')[0];
        const needsExternal = REACT_DEPENDENT.has(pkg) || REACT_DEPENDENT.has(basePkg);
        const esmUrl = needsExternal
            ? `https://esm.sh/${pkg}?external=react,react-dom`
            : `https://esm.sh/${pkg}`;
        imports[pkg] = esmUrl;
    }
    return { imports };
}
/**
 * Build the <script type="module"> package loader code.
 * Dynamically imports packages from esm.sh and assigns to window globals.
 * Skips packages that already have polyfill overrides loaded.
 */
export function buildModuleLoader(packages, globalMap) {
    const lines = [];
    for (const pkg of packages) {
        if (SKIP_PACKAGES.has(pkg) || pkg.startsWith('@types/'))
            continue;
        if (BASE_PACKAGES.has(pkg))
            continue;
        if (INLINE_UTILS[pkg])
            continue;
        if (INLINE_POLYFILL_PACKAGES[pkg])
            continue;
        const globalName = globalMap[pkg];
        if (!globalName)
            continue;
        // Only import if not already loaded by a polyfill or UMD script
        lines.push(`  if (!window.${globalName}) { try { const m = await import('${pkg}'); window.${globalName} = m.default || m; Object.assign(window.${globalName}, m); } catch(e) { console.warn('[esm.sh] Failed to load ${pkg}:', e); } }`);
    }
    if (lines.length === 0) {
        return `window.__pkgsReady = true; window.dispatchEvent(new Event('__pkgsReady'));`;
    }
    return `(async function() {
${lines.join('\n')}
  window.__pkgsReady = true;
  window.dispatchEvent(new Event('__pkgsReady'));
})();`;
}
/**
 * Build polyfill inline code for detected packages.
 * Polyfills run synchronously before the module loader as a safety net.
 */
export function buildFallbackPolyfillCode(packages) {
    const code = [];
    for (const pkg of packages) {
        if (INLINE_POLYFILL_PACKAGES[pkg]) {
            code.push(INLINE_POLYFILL_PACKAGES[pkg]);
        }
    }
    return code.join('\n');
}
/** @deprecated Alias for buildFallbackPolyfillCode */
export const getPolyfillInlineCode = buildFallbackPolyfillCode;
/**
 * Collapse multi-line import statements into single lines for easier regex matching.
 */
export function collapseMultiLineImports(code) {
    return code.replace(/^import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/gm, (_m, clause, source) => {
        return `import ${clause.replace(/\s+/g, ' ').trim()} from '${source}'`;
    });
}
/**
 * Scan source code for imports of packages not in package.json.
 */
export function detectImportedPackages(files) {
    const packages = new Set();
    for (const file of files) {
        if (!/\.(tsx?|jsx?)$/.test(file.filePath))
            continue;
        // Collapse multi-line imports first so single-line regex can match them
        const collapsed = collapseMultiLineImports(file.content);
        const importMatches = collapsed.matchAll(/^import\s+.+?\s+from\s+['"]([^./][^'"]*)['"]/gm);
        for (const match of importMatches) {
            const source = match[1];
            const pkg = source.startsWith('@')
                ? source.split('/').slice(0, 2).join('/')
                : source.split('/')[0];
            packages.add(pkg);
            // Also add full subpath (e.g. 'gsap/ScrollTrigger', 'lodash/debounce')
            // so it gets its own import map entry
            if (source !== pkg) {
                packages.add(source);
            }
        }
    }
    return [...packages];
}
/**
 * Transform external imports to use CDN globals.
 * Relative imports (./xxx, ../xxx) are stripped (they're inlined).
 * Handles both single-line and multi-line import statements.
 */
export function transformImportsForCDN(code, globalMap) {
    // First: collapse multi-line imports into single lines
    code = collapseMultiLineImports(code);
    // Now process all single-line imports
    return code.replace(/^import\s+(.+?)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/gm, (_match, importClause, source) => {
        // Relative imports — strip (files are inlined)
        if (source.startsWith('.') || source.startsWith('/')) {
            return '';
        }
        // Type-only imports — strip
        if (importClause.startsWith('type ') || importClause.startsWith('type{') || importClause.startsWith('type {')) {
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
        // React and ReactDOM are pre-loaded globals with hooks already destructured — strip entirely
        if (source === 'react' || source === 'react-dom' || source === 'react-dom/client') {
            return '';
        }
        // import { X, Y } from 'pkg'
        const namedMatch = importClause.match(/^\{(.+)\}$/);
        if (namedMatch) {
            return `var { ${namedMatch[1].replace(/\s+as\s+/g, ': ')} } = ${g};`;
        }
        // import X, { Y, Z } from 'pkg'
        const mixedMatch = importClause.match(/^(\w+)\s*,\s*\{(.+)\}$/);
        if (mixedMatch) {
            return `var ${mixedMatch[1].trim()} = ${g}.default || ${g};\nvar { ${mixedMatch[2].trim().replace(/\s+as\s+/g, ': ')} } = ${g};`;
        }
        // import * as X from 'pkg'
        const nsMatch = importClause.match(/^\*\s+as\s+(\w+)$/);
        if (nsMatch) {
            return `var ${nsMatch[1]} = ${g};`;
        }
        // import X from 'pkg' (default)
        const defaultMatch = importClause.match(/^(\w+)$/);
        if (defaultMatch) {
            return `var ${defaultMatch[1]} = ${g}.default || ${g};`;
        }
        return ''; // Fallback: strip
    });
}
/**
 * Legacy: resolve package.json dependencies to CDN scripts.
 * Used when PREVIEW_ENGINE=cdn (rollback mode).
 */
export function resolveCDNDependencies(artifact) {
    const allPkgs = detectImportedPackages(artifact.files);
    const pkgFile = artifact.files.find(f => f.filePath === 'package.json');
    if (pkgFile) {
        try {
            const pkg = JSON.parse(pkgFile.content);
            const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
            for (const p of Object.keys(deps)) {
                if (!allPkgs.includes(p))
                    allPkgs.push(p);
            }
        }
        catch { }
    }
    const globalMap = buildGlobalMap(allPkgs);
    const inlineCode = [];
    for (const pkg of allPkgs) {
        if (INLINE_UTILS[pkg]) {
            inlineCode.push(INLINE_UTILS[pkg].code);
        }
        if (INLINE_POLYFILL_PACKAGES[pkg]) {
            inlineCode.push(INLINE_POLYFILL_PACKAGES[pkg]);
        }
    }
    return {
        scriptTags: [],
        inlineSetup: inlineCode.join('\n'),
        globalMap,
    };
}
export function getAvailablePackageNames() {
    return ['(any npm package via esm.sh)'];
}
//# sourceMappingURL=cdn-resolver.js.map