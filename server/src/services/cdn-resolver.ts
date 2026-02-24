import type { ProjectArtifact } from '../../../shared/types.js'

// ─── CDN Package Resolution ───
// Maps npm packages to CDN URLs with global variable names for iframe preview

export interface CDNPackageInfo {
  cdnUrl: string
  globalName: string
}

// Known packages with reliable UMD/global builds
const CDN_MAP: Record<string, CDNPackageInfo> = {
  // Already loaded in base template
  'react': { cdnUrl: '', globalName: 'React' },
  'react-dom': { cdnUrl: '', globalName: 'ReactDOM' },
  'react-dom/client': { cdnUrl: '', globalName: 'ReactDOM' },
  'lucide-react': { cdnUrl: '', globalName: 'lucideReact' },

  // Charts — recharts UMD (non-minified, .min.js does not exist)
  'recharts': {
    cdnUrl: 'https://unpkg.com/recharts@2.15.0/umd/Recharts.js',
    globalName: 'Recharts',
  },
  'chart.js': {
    cdnUrl: 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js',
    globalName: 'Chart',
  },
  'chart.js/auto': {
    cdnUrl: 'https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js',
    globalName: 'Chart',
  },

  // Router — react-router-dom needs react-router as peer, both are loaded via PEER_DEPS
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

  // Lodash
  'lodash': {
    cdnUrl: 'https://cdn.jsdelivr.net/npm/lodash@4/lodash.min.js',
    globalName: '_',
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

  // UUID
  'uuid': {
    cdnUrl: 'https://cdn.jsdelivr.net/npm/uuid@9/dist/umd/uuid.min.js',
    globalName: 'uuid',
  },

  // GSAP animation library
  'gsap': {
    cdnUrl: 'https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js',
    globalName: 'gsap',
  },
  'gsap/ScrollTrigger': {
    cdnUrl: 'https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js',
    globalName: 'ScrollTrigger',
  },

}

// Packages that require <script type="module"> to load ESM builds
// These get a special inline wrapper that assigns to window global
const INLINE_ESM_PACKAGES: Record<string, { esmUrl: string; globalName: string; setupCode: string }> = {}

// Packages that do NOT have UMD builds — provide inline polyfill implementations
// These are lightweight replacements that cover the most common API surface
const INLINE_POLYFILL_PACKAGES: Record<string, string> = {
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
  // sonner — provide a simple toast function
  'sonner': `(function(){
    function Toaster(){return null;}
    function toast(msg){console.log('[toast]',msg);}
    toast.success=function(m){console.log('[toast:success]',m);};
    toast.error=function(m){console.log('[toast:error]',m);};
    toast.info=function(m){console.log('[toast:info]',m);};
    toast.warning=function(m){console.log('[toast:warning]',m);};
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
  // react-markdown — provide a simple passthrough that renders children as text
  'react-markdown': `(function(){
    function ReactMarkdown(props){
      var text=props.children||'';
      return React.createElement('div',{className:props.className,dangerouslySetInnerHTML:{__html:text.replace(/\\n/g,'<br>')}});
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
}

// Peer dependencies: if package A is used, package B must also be loaded first
const PEER_DEPS: Record<string, string[]> = {
  'react-router-dom': ['react-router'],
  'react-chartjs-2': ['chart.js'],
  'gsap/ScrollTrigger': ['gsap'],
  '@gsap/react': ['gsap'],
}

// Tiny utility packages with inline polyfill implementations
// Each entry: { code: inline JS, globalName: name for import resolution }
const INLINE_UTILS: Record<string, { code: string; globalName: string }> = {
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

/**
 * Get all available package names (CDN + polyfill + inline utils).
 */
export function getAvailablePackageNames(): string[] {
  const names = new Set<string>([
    ...Object.keys(CDN_MAP),
    ...Object.keys(INLINE_POLYFILL_PACKAGES),
    ...Object.keys(INLINE_UTILS),
  ])
  return [...names].sort()
}

export interface CDNResolution {
  scriptTags: string[]
  inlineSetup: string
  globalMap: Record<string, string>
}

// Build tools and types that are never needed at runtime
const SKIP_PACKAGES = new Set([
  'typescript', 'vite', '@vitejs/plugin-react', 'tailwindcss', 'postcss', 'autoprefixer',
  '@types/react', '@types/react-dom', '@types/node', 'eslint', 'prettier',
  '@eslint/js', 'globals', 'typescript-eslint', '@vitejs/plugin-react-swc',
])

/**
 * Resolve package.json dependencies to CDN scripts and global mappings.
 * Handles: CDN UMD builds, peer dependencies, ESM module wrappers,
 * inline polyfills for packages without UMD, and inline utility shims.
 */
export function resolveCDNDependencies(artifact: ProjectArtifact): CDNResolution {
  const pkgFile = artifact.files.find(f => f.filePath === 'package.json')
  if (!pkgFile) return { scriptTags: [], inlineSetup: '', globalMap: {} }

  let deps: Record<string, string> = {}
  try {
    const pkg = JSON.parse(pkgFile.content)
    deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
  } catch {
    return { scriptTags: [], inlineSetup: '', globalMap: {} }
  }

  const scriptTags: string[] = []
  const inlineCode: string[] = []
  const globalMap: Record<string, string> = {}
  const loadedUrls = new Set<string>() // deduplication

  // Helper to add a CDN script tag (with dedup)
  function addScript(url: string) {
    if (!url || loadedUrls.has(url)) return
    loadedUrls.add(url)
    scriptTags.push(`<script src="${url}"><\/script>`)
  }

  // Resolve a single package (recursively handles peer deps)
  function resolvePkg(pkgName: string) {
    if (globalMap[pkgName]) return // already resolved

    // 1. Load peer dependencies first
    if (PEER_DEPS[pkgName]) {
      for (const peer of PEER_DEPS[pkgName]) {
        resolvePkg(peer)
      }
    }

    // 2. Check CDN map (UMD builds)
    if (CDN_MAP[pkgName]) {
      const info = CDN_MAP[pkgName]
      addScript(info.cdnUrl)
      globalMap[pkgName] = info.globalName
      return
    }

    // 3. Check inline utils (clsx, twMerge, cva, etc.)
    if (INLINE_UTILS[pkgName]) {
      const util = INLINE_UTILS[pkgName]
      inlineCode.push(util.code)
      globalMap[pkgName] = util.globalName
      return
    }

    // 4. Check inline polyfills (framer-motion, sonner, etc.)
    if (INLINE_POLYFILL_PACKAGES[pkgName]) {
      inlineCode.push(INLINE_POLYFILL_PACKAGES[pkgName])
      // Map globalName for import resolution
      const polyfillGlobalNames: Record<string, string> = {
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
      }
      if (polyfillGlobalNames[pkgName]) {
        globalMap[pkgName] = polyfillGlobalNames[pkgName]
      }
      return
    }

    // 5. Check ESM packages (loaded via module script)
    if (INLINE_ESM_PACKAGES[pkgName]) {
      const esm = INLINE_ESM_PACKAGES[pkgName]
      globalMap[pkgName] = esm.globalName
      // ESM module tags are handled separately in bundleToHtml
      return
    }

    // 6. Skip build tools
    if (SKIP_PACKAGES.has(pkgName)) return

    console.log(`[CDN] Package "${pkgName}" not available in preview`)
  }

  for (const pkg of Object.keys(deps)) {
    resolvePkg(pkg)
  }

  return {
    scriptTags,
    inlineSetup: inlineCode.join('\n'),
    globalMap,
  }
}

/**
 * Get ESM module script tags (must be <script type="module">)
 * Called separately from bundleToHtml because these need different script type
 */
export function getESMScriptTags(deps: Record<string, string>): string[] {
  const tags: string[] = []
  for (const pkg of Object.keys(deps)) {
    if (INLINE_ESM_PACKAGES[pkg]) {
      tags.push(`<script type="module">${INLINE_ESM_PACKAGES[pkg].setupCode}<\/script>`)
    }
  }
  return tags
}

/**
 * Also scan source code for imports of packages not in package.json
 * (in case Logic didn't generate a package.json or forgot a dep)
 */
export function detectImportedPackages(files: { filePath: string; content: string }[]): string[] {
  const packages = new Set<string>()

  for (const file of files) {
    if (!/\.(tsx?|jsx?)$/.test(file.filePath)) continue
    const importMatches = file.content.matchAll(/^import\s+.+?\s+from\s+['"]([^./][^'"]*)['"]/gm)
    for (const match of importMatches) {
      // Get the package name (handle scoped packages like @radix-ui/react-slot)
      const source = match[1]
      const pkg = source.startsWith('@')
        ? source.split('/').slice(0, 2).join('/')
        : source.split('/')[0]
      packages.add(pkg)
    }
  }

  return [...packages]
}

/**
 * Transform external imports to use CDN globals.
 * Relative imports (./xxx, ../xxx) are stripped (they're inlined).
 * Handles both single-line and multi-line import statements.
 */
export function transformImportsForCDN(code: string, globalMap: Record<string, string>): string {
  // First: collapse multi-line imports into single lines
  // e.g. "import {\n  Heart,\n  Menu\n} from 'lucide-react'" → "import { Heart, Menu } from 'lucide-react'"
  code = code.replace(
    /^import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/gm,
    (match, importClause: string, source: string) => {
      // Collapse whitespace/newlines in the import clause
      const collapsed = importClause.replace(/\s+/g, ' ').trim()
      return `import ${collapsed} from '${source}'`
    }
  )

  // Now process all single-line imports
  return code.replace(
    /^import\s+(.+?)\s+from\s+['"]([^'"]+)['"]\s*;?\s*$/gm,
    (_match, importClause: string, source: string) => {
      // Relative imports — strip (files are inlined)
      if (source.startsWith('.') || source.startsWith('/')) {
        return ''
      }

      // Type-only imports — strip
      if (importClause.startsWith('type ') || importClause.startsWith('type{') || importClause.startsWith('type {')) {
        return ''
      }

      // Find the package name (handle @scoped/packages and subpaths)
      const pkgName = source.startsWith('@')
        ? source.split('/').slice(0, 2).join('/')
        : source.split('/')[0]

      const globalName = globalMap[source] || globalMap[pkgName]
      if (!globalName) return '' // Unknown — strip

      const g = `(window.${globalName} || {})`

      // import { X, Y } from 'pkg'
      const namedMatch = importClause.match(/^\{(.+)\}$/)
      if (namedMatch) {
        return `const { ${namedMatch[1].replace(/\s+as\s+/g, ': ')} } = ${g};`
      }

      // import X, { Y, Z } from 'pkg'
      const mixedMatch = importClause.match(/^(\w+)\s*,\s*\{(.+)\}$/)
      if (mixedMatch) {
        return `const ${mixedMatch[1].trim()} = ${g}.default || ${g};\nconst { ${mixedMatch[2].trim().replace(/\s+as\s+/g, ': ')} } = ${g};`
      }

      // import * as X from 'pkg'
      const nsMatch = importClause.match(/^\*\s+as\s+(\w+)$/)
      if (nsMatch) {
        return `const ${nsMatch[1]} = ${g};`
      }

      // import X from 'pkg' (default)
      const defaultMatch = importClause.match(/^(\w+)$/)
      if (defaultMatch) {
        return `const ${defaultMatch[1]} = ${g}.default || ${g};`
      }

      return '' // Fallback: strip
    }
  )
}
