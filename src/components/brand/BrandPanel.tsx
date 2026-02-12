import { FileText, Monitor, Terminal } from 'lucide-react'

const BrandPanel = () => (
  <aside className="w-96 border-l border-slate-800/40 bg-[#0a0d14]/40 p-10 hidden xl:flex flex-col">
    <div className="mb-12">
      <h3 className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-8">Conocimiento de Marca</h3>
      <div className="space-y-4">
        <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-xl hover:border-slate-700 transition-all">
          <div className="flex items-center gap-3 mb-3 text-white">
            <FileText size={18} className="text-indigo-400" />
            <span className="text-xs font-semibold">Brand Persona</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">Empresa de tecnología enfocada en software de agendamiento para salones de belleza.</p>
        </div>
        <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-xl hover:border-slate-700 transition-all">
          <div className="flex items-center gap-3 mb-3 text-white">
            <Monitor size={18} className="text-indigo-400" />
            <span className="text-xs font-semibold">Activos Digitales</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-slate-800 rounded text-[9px] font-bold text-slate-400">Sitio Web</span>
            <span className="px-2 py-1 bg-slate-800 rounded text-[9px] font-bold text-slate-400">Meta Business</span>
          </div>
        </div>
      </div>
    </div>

    <div className="mt-auto p-8 bg-slate-900/30 border border-slate-800 rounded-xl">
      <div className="flex items-center gap-4 mb-6 text-indigo-400">
        <div className="p-2.5 bg-indigo-500/10 rounded-xl">
          <Terminal size={20} />
        </div>
        <span className="text-sm font-semibold">Live Logs</span>
      </div>
      <div className="space-y-3 font-mono text-[10px] text-slate-500 leading-relaxed">
        <p className="flex justify-between"><span>[OK]</span> <span>Handshake_Success</span></p>
        <p className="flex justify-between"><span>[OK]</span> <span>Agents_Ready</span></p>
        <p className="flex justify-between"><span>[SCAN]</span> <span>SEO_Index_Safe</span></p>
        <p className="flex items-center gap-2 text-indigo-400 mt-4 font-bold">
          <span className="w-1 h-1 bg-indigo-400 rounded-full animate-pulse"></span>
          _ Awaiting command...
        </p>
      </div>
    </div>
  </aside>
)

export default BrandPanel
