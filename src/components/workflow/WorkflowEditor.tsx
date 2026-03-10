import { useEffect, useMemo, useRef, useState } from 'react'
import { Background, Controls, MiniMap, ReactFlow, type Edge, type Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Check, Clapperboard, Download, Film, Loader2, Play, Plus, Send, Share2, Upload, Workflow, X } from 'lucide-react'

type Mode = 'guided' | 'advanced'
type AspectRatio = '16:9' | '9:16' | '1:1'
type SceneStatus = 'idle' | 'running' | 'complete' | 'error'

interface WorkflowNodeData extends Record<string, unknown> {
  title: string
  prompt?: string
  duration?: '3' | '5' | '10'
  imageUrl?: string | null
  videoUrl?: string | null
  status?: SceneStatus
  progress?: number
  platform?: string
  goal?: string
  style?: string
}

interface WorkflowDraft {
  brief?: { platform?: string; goal?: string; style?: string; aspectRatio?: AspectRatio }
  suggestions?: { hook?: string; cta?: string; resources?: string[] }
  nodes?: Node<WorkflowNodeData>[]
  edges?: Edge[]
}

interface Props {
  initialPrompt?: string
  onClose: () => void
}

const API_BASE = '/api/workflow'

function getToken() {
  return localStorage.getItem('plury_token') || ''
}

function SceneCard({
  node,
  onUpdate,
  onUpload,
}: {
  node: Node<WorkflowNodeData>
  onUpdate: (id: string, patch: Partial<WorkflowNodeData>) => void
  onUpload: (id: string, file: File) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const data = node.data

  return (
    <div className="w-60 rounded-2xl border border-white/10 bg-[#151525] overflow-hidden">
      <div className="h-1 bg-white/5">
        <div
          className={`h-full ${data.status === 'complete' ? 'bg-emerald-500' : data.status === 'error' ? 'bg-red-500' : 'bg-gradient-to-r from-[#8b5cf6] to-blue-500'}`}
          style={{ width: `${data.status === 'idle' ? 0 : Math.max(Number(data.progress || 0), data.status === 'complete' ? 100 : 12)}%` }}
        />
      </div>
      <div className="relative h-36 bg-white/[0.03] flex items-center justify-center cursor-pointer" onClick={() => fileRef.current?.click()}>
        {typeof data.imageUrl === 'string' ? (
          <img src={data.imageUrl} alt={String(data.title)} className="w-full h-full object-cover" />
        ) : typeof data.videoUrl === 'string' ? (
          <video src={data.videoUrl} className="w-full h-full object-cover" muted />
        ) : (
          <div className="flex flex-col items-center gap-1 text-white/35">
            <Upload size={18} />
            <span className="text-[10px]">Subir imagen</span>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onUpload(node.id, file)
          }}
        />
      </div>
      <div className="p-3">
        <input
          value={String(data.title || '')}
          onChange={(e) => onUpdate(node.id, { title: e.target.value })}
          className="w-full bg-transparent text-sm font-semibold text-white/90 outline-none"
        />
        <textarea
          value={String(data.prompt || '')}
          onChange={(e) => onUpdate(node.id, { prompt: e.target.value })}
          rows={3}
          className="mt-2 w-full resize-none bg-transparent text-xs text-white/70 outline-none"
        />
        <div className="mt-3 flex gap-1">
          {(['3', '5', '10'] as const).map((d) => (
            <button
              key={d}
              onClick={() => onUpdate(node.id, { duration: d })}
              className={`rounded-md px-2 py-1 text-[10px] ${data.duration === d ? 'bg-[#8b5cf6]/30 text-[#c4b5fd]' : 'bg-white/5 text-white/45'}`}
            >
              {d}s
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function WorkflowEditor({ initialPrompt = '', onClose }: Props) {
  const [prompt, setPrompt] = useState(initialPrompt)
  const [mode, setMode] = useState<Mode>('guided')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9')
  const [draft, setDraft] = useState<WorkflowDraft | null>(null)
  const [nodes, setNodes] = useState<Node<WorkflowNodeData>[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [isAssisting, setIsAssisting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null)
  const promptRef = useRef<HTMLTextAreaElement>(null)

  const sceneNodes = useMemo(() => nodes.filter((node) => node.type === 'scene'), [nodes])
  const summary = useMemo(() => {
    const brief = draft?.brief || {}
    return [
      ['Plataforma', brief.platform || 'No definida'],
      ['Objetivo', brief.goal || 'General'],
      ['Estilo', brief.style || 'Comercial'],
      ['Aspecto', brief.aspectRatio || aspectRatio],
    ]
  }, [draft, aspectRatio])

  useEffect(() => { promptRef.current?.focus() }, [])
  useEffect(() => {
    if (initialPrompt && nodes.length === 0) void handleAssist()
  }, [initialPrompt]) // eslint-disable-line react-hooks/exhaustive-deps

  function updateNode(id: string, patch: Partial<WorkflowNodeData>) {
    setNodes((prev) => prev.map((node) => node.id === id ? { ...node, data: { ...node.data, ...patch } } : node))
  }

  async function handleAssist() {
    if (!prompt.trim() || isAssisting) return
    setIsAssisting(true)
    try {
      const res = await fetch(`${API_BASE}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ message: prompt }),
      })
      const data = await res.json()
      setDraft(data)
      setNodes(data.nodes || [])
      setEdges(data.edges || [])
      setAspectRatio(data.brief?.aspectRatio || '16:9')
    } finally {
      setIsAssisting(false)
    }
  }

  async function uploadImage(nodeId: string, file: File) {
    updateNode(nodeId, { imageUrl: URL.createObjectURL(file), status: 'running', progress: 30 })
    const formData = new FormData()
    formData.append('image', file)
    const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: formData })
    if (!res.ok) return updateNode(nodeId, { status: 'error', progress: 0 })
    const data = await res.json()
    if (data.url) updateNode(nodeId, { imageUrl: data.url, status: 'idle', progress: 0 })
  }

  async function processScene(node: Node<WorkflowNodeData>) {
    let imageUrl = typeof node.data.imageUrl === 'string' ? node.data.imageUrl : null
    if (!imageUrl) {
      updateNode(node.id, { status: 'running', progress: 20 })
      const imgRes = await fetch(`${API_BASE}/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ prompt: node.data.prompt, aspectRatio }),
      })
      const imgData = await imgRes.json()
      if (!imgData.success || !imgData.url) throw new Error('image')
      imageUrl = imgData.url
      updateNode(node.id, { imageUrl, progress: 50 })
    }

    const vidRes = await fetch(`${API_BASE}/image-to-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ imageUrl, prompt: node.data.prompt, aspectRatio, duration: node.data.duration || '5' }),
    })
    const vidData = await vidRes.json()
    if (!vidData.success || !vidData.url) throw new Error('video')
    updateNode(node.id, { videoUrl: vidData.url, status: 'complete', progress: 100 })
    return vidData.url as string
  }

  async function handleGenerate() {
    if (sceneNodes.length === 0 || isGenerating) return
    setIsGenerating(true)
    setFinalVideoUrl(null)
    let lastClip: string | null = null
    for (const node of sceneNodes) {
      try {
        lastClip = await processScene(node)
      } catch {
        updateNode(node.id, { status: 'error', progress: 0 })
      }
    }
    setFinalVideoUrl(lastClip)
    setIsGenerating(false)
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0a0a1a] min-h-0">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-blue-600 flex items-center justify-center">
            <Film size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white/90">Places Video Workflow</p>
            <p className="text-[11px] text-white/45">Modo guiado para principiantes y canvas para usuarios avanzados</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-white/5 p-1 flex">
            <button onClick={() => setMode('guided')} className={`px-3 py-1.5 rounded-lg text-xs ${mode === 'guided' ? 'bg-white text-black' : 'text-white/60'}`}>Guiado</button>
            <button onClick={() => setMode('advanced')} className={`px-3 py-1.5 rounded-lg text-xs ${mode === 'advanced' ? 'bg-white text-black' : 'text-white/60'}`}>Nodos</button>
          </div>
          <button onClick={onClose} className="text-white/50"><X size={18} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {!sceneNodes.length && !isAssisting && (
          <div className="h-full flex flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="w-20 h-20 rounded-[28px] bg-white/[0.04] border border-white/10 flex items-center justify-center">
              <Clapperboard size={36} className="text-[#a78bfa]" />
            </div>
            <div className="max-w-xl">
              <p className="text-lg font-semibold text-white/90">Escribe tu idea y te devolvemos un workflow listo.</p>
              <p className="mt-2 text-sm text-white/45">El backend ahora construye brief, escenas, sugerencias y nodos iniciales en una sola respuesta.</p>
            </div>
          </div>
        )}

        {isAssisting && (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-white/45">
            <Loader2 size={32} className="animate-spin text-[#a78bfa]" />
            <p className="text-sm">Generando draft de workflow...</p>
          </div>
        )}

        {!!sceneNodes.length && mode === 'guided' && (
          <div className="h-full overflow-y-auto px-4 py-4">
            <div className="max-w-6xl mx-auto space-y-5">
              <div className="grid gap-3 md:grid-cols-4">
                {summary.map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-white/35">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-white/85">{value}</p>
                  </div>
                ))}
              </div>

              {draft?.suggestions && (
                <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#18142b] to-[#111827] p-5">
                  <div className="flex items-center gap-2 text-white/85">
                    <Workflow size={16} className="text-[#a78bfa]" />
                    <span className="text-sm font-semibold">Sugerencias</span>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-white/[0.04] px-4 py-3"><p className="text-[11px] text-white/35">Hook</p><p className="mt-1 text-sm text-white/75">{draft.suggestions.hook}</p></div>
                    <div className="rounded-2xl bg-white/[0.04] px-4 py-3"><p className="text-[11px] text-white/35">CTA</p><p className="mt-1 text-sm text-white/75">{draft.suggestions.cta}</p></div>
                    <div className="rounded-2xl bg-white/[0.04] px-4 py-3"><p className="text-[11px] text-white/35">Recursos</p><p className="mt-1 text-sm text-white/75">{(draft.suggestions.resources || []).join(', ')}</p></div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 overflow-x-auto">
                {sceneNodes.map((node) => <SceneCard key={node.id} node={node} onUpdate={updateNode} onUpload={uploadImage} />)}
                <button onClick={() => setNodes((prev) => [...prev, { id: `scene-${Date.now()}`, type: 'scene', position: { x: 640, y: prev.length * 140 }, data: { title: 'Nueva escena', prompt: '', duration: '5', status: 'idle', progress: 0 } }])} className="w-14 h-36 rounded-2xl border border-dashed border-white/12 bg-white/[0.03] text-white/30 hover:text-white/70">
                  <Plus size={20} className="mx-auto" />
                </button>
              </div>
            </div>
          </div>
        )}

        {!!sceneNodes.length && mode === 'advanced' && (
          <ReactFlow nodes={nodes} edges={edges} fitView className="bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.10),_transparent_40%),linear-gradient(180deg,#090910,#0d1020)]">
            <MiniMap pannable zoomable />
            <Controls />
            <Background color="rgba(255,255,255,0.06)" gap={20} />
          </ReactFlow>
        )}
      </div>

      {finalVideoUrl && (
        <div className="border-t border-white/10 bg-[#0f1020] px-4 py-4">
          <div className="max-w-5xl mx-auto grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
            <div className="rounded-3xl border border-white/10 bg-[#16162a]/90 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2"><Check size={14} className="text-emerald-400" /><span className="text-xs font-medium text-white/65">Resultado actual</span></div>
              <div className="p-4">
                <video src={finalVideoUrl} controls className="w-full rounded-2xl" autoPlay muted />
                <div className="flex gap-2 mt-3">
                  <a href={finalVideoUrl} download className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-white/70 rounded-lg text-xs"><Download size={13} />Descargar</a>
                  <button onClick={() => navigator.clipboard.writeText(window.location.origin + finalVideoUrl)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-white/70 rounded-lg text-xs"><Share2 size={13} />Copiar URL</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-white/10 bg-[#0e0e22] px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-2xl px-3 py-2">
            <textarea ref={promptRef} value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={1} className="w-full bg-transparent text-white/80 text-sm resize-none outline-none" placeholder="Ej: Reel vertical para cafeteria con hook fuerte, oferta y cierre con CTA" />
          </div>
          <div className="flex items-center gap-2">
            <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} className="bg-white/[0.04] border border-white/[0.08] text-white/60 text-xs rounded-xl px-3 py-3 outline-none">
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
              <option value="1:1">1:1</option>
            </select>
            {!sceneNodes.length ? (
              <button onClick={handleAssist} disabled={!prompt.trim() || isAssisting} className="flex items-center gap-1.5 px-4 py-3 bg-[#8b5cf6] disabled:opacity-40 text-white text-sm font-medium rounded-2xl">
                {isAssisting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                Crear Workflow
              </button>
            ) : (
              <button onClick={handleGenerate} disabled={isGenerating} className="flex items-center gap-1.5 px-4 py-3 bg-gradient-to-r from-[#8b5cf6] to-blue-600 disabled:opacity-40 text-white text-sm font-medium rounded-2xl">
                {isGenerating ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                Generar Video
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
