import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Clapperboard, Film, Loader2, MessageSquare, Play, Plus, Send, X } from 'lucide-react'
import SceneNode, { type SceneNodeData } from './nodes/SceneNode'
import PromptNode from './nodes/PromptNode'
import OutputNode from './nodes/OutputNode'
import SuggestionsNode from './nodes/SuggestionsNode'

type AspectRatio = '16:9' | '9:16' | '1:1'

interface WorkflowDraft {
  brief?: { platform?: string; goal?: string; style?: string; aspectRatio?: AspectRatio }
  suggestions?: { hook?: string; cta?: string; resources?: string[] }
  scenes?: Array<{ id: string; title: string; prompt: string; duration: string }>
  nodes?: Node[]
  edges?: Edge[]
}

interface Props {
  initialPrompt?: string
  onClose: () => void
  onShowChat?: () => void
}

const API_BASE = '/api/workflow'

function getToken() {
  return localStorage.getItem('plury_token') || ''
}

// ─── Custom node registry ───
const nodeTypes = {
  prompt: PromptNode,
  scene: SceneNode,
  output: OutputNode,
  suggestions: SuggestionsNode,
}

// ─── Build nodes+edges from draft response ───
function buildGraphFromDraft(
  draft: WorkflowDraft,
  prompt: string,
  aspectRatio: AspectRatio,
  updateNode: (id: string, patch: Record<string, unknown>) => void,
  uploadImage: (id: string, file: File) => void,
  deleteNode: (id: string) => void,
): { nodes: Node[]; edges: Edge[] } {
  const scenes = draft.scenes || []
  const nodes: Node[] = []
  const edges: Edge[] = []
  const hasSuggestions = !!(draft.suggestions?.hook || draft.suggestions?.cta || (draft.suggestions?.resources && draft.suggestions.resources.length > 0))

  const scenesCenter = scenes.length > 1 ? ((scenes.length - 1) * 280) / 2 : 80

  // 1. Prompt node (left)
  nodes.push({
    id: 'prompt-root',
    type: 'prompt',
    position: { x: 0, y: scenesCenter - 60 },
    data: {
      prompt,
      platform: draft.brief?.platform || '',
      goal: draft.brief?.goal || '',
      style: draft.brief?.style || '',
      aspectRatio: draft.brief?.aspectRatio || aspectRatio,
      onUpdate: updateNode,
    },
  })

  // 2. Suggestions node (below prompt, optional)
  if (hasSuggestions) {
    nodes.push({
      id: 'suggestions',
      type: 'suggestions',
      position: { x: 0, y: scenesCenter + 160 },
      data: {
        hook: draft.suggestions?.hook || '',
        cta: draft.suggestions?.cta || '',
        resources: draft.suggestions?.resources || [],
      },
    })
    // Connect prompt → suggestions
    edges.push({
      id: 'e-prompt-suggestions',
      source: 'prompt-root',
      target: 'suggestions',
      style: { stroke: '#a78bfa', strokeWidth: 1.5, strokeDasharray: '6 3' },
    })
  }

  // 3. Scene nodes (middle column, stacked vertically)
  scenes.forEach((scene, i) => {
    const nodeId = scene.id || `scene-${i}`
    nodes.push({
      id: nodeId,
      type: 'scene',
      position: { x: 400, y: i * 280 },
      data: {
        title: scene.title,
        prompt: scene.prompt,
        duration: (scene.duration || '5') as '3' | '5' | '10',
        imageUrl: null,
        videoUrl: null,
        status: 'idle',
        progress: 0,
        sceneIndex: i,
        onUpdate: updateNode,
        onUpload: uploadImage,
        onDelete: deleteNode,
      } satisfies SceneNodeData,
    })

    // Connect prompt → scene
    edges.push({
      id: `e-prompt-${nodeId}`,
      source: 'prompt-root',
      target: nodeId,
      animated: true,
      style: { stroke: '#8b5cf6', strokeWidth: 2 },
    })

    // Connect scene → output
    edges.push({
      id: `e-${nodeId}-output`,
      source: nodeId,
      target: 'output-final',
      style: { stroke: '#22c55e', strokeWidth: 2 },
    })
  })

  // 4. Output node (right)
  nodes.push({
    id: 'output-final',
    type: 'output',
    position: { x: 780, y: scenesCenter - 40 },
    data: { videoUrl: null, status: 'idle', sceneCount: scenes.length },
  })

  return { nodes, edges }
}

export default function WorkflowEditor({ initialPrompt = '', onClose, onShowChat }: Props) {
  const [prompt, setPrompt] = useState(initialPrompt)
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9')
  const [_draft, setDraft] = useState<WorkflowDraft | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [isAssisting, setIsAssisting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([])
  const [chatLoading, setChatLoading] = useState(false)
  const promptRef = useRef<HTMLTextAreaElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const sceneNodes = useMemo(() => nodes.filter((n) => n.type === 'scene'), [nodes])
  const hasScenes = sceneNodes.length > 0

  // ─── Node update helpers (passed into custom nodes via data) ───
  const updateNode = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      setNodes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
      )
    },
    [setNodes],
  )

  const uploadImage = useCallback(
    async (nodeId: string, file: File) => {
      updateNode(nodeId, { imageUrl: URL.createObjectURL(file), status: 'running', progress: 30 })
      const formData = new FormData()
      formData.append('image', file)
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      })
      if (!res.ok) return updateNode(nodeId, { status: 'error', progress: 0 })
      const data = await res.json()
      if (data.url) updateNode(nodeId, { imageUrl: data.url, status: 'idle', progress: 0 })
    },
    [updateNode],
  )

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== nodeId))
      setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId))
    },
    [setNodes, setEdges],
  )

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: '#8b5cf6', strokeWidth: 2 } }, eds)),
    [setEdges],
  )

  // ─── Initial load ───
  useEffect(() => {
    promptRef.current?.focus()
  }, [])

  useEffect(() => {
    if (initialPrompt && nodes.length === 0) void handleAssist()
  }, [initialPrompt]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── API: Generate draft ───
  async function handleAssist() {
    if (!prompt.trim() || isAssisting) return
    setIsAssisting(true)
    try {
      const res = await fetch(`${API_BASE}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ message: prompt }),
      })
      const data: WorkflowDraft = await res.json()
      setDraft(data)
      setAspectRatio(data.brief?.aspectRatio || '16:9')

      // Build the visual graph
      const graph = buildGraphFromDraft(data, prompt, data.brief?.aspectRatio || '16:9', updateNode, uploadImage, deleteNode)
      setNodes(graph.nodes)
      setEdges(graph.edges)
    } finally {
      setIsAssisting(false)
    }
  }

  // ─── API: Process scenes ───
  async function processScene(node: Node) {
    const d = node.data as SceneNodeData
    let imageUrl = typeof d.imageUrl === 'string' ? d.imageUrl : null

    if (!imageUrl) {
      updateNode(node.id, { status: 'running', progress: 35 })
      const vidRes = await fetch(`${API_BASE}/text-to-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ prompt: d.prompt, aspectRatio, duration: d.duration || '5' }),
      })
      const vidData = await vidRes.json()
      if (!vidData.success || !vidData.url) throw new Error('video')
      updateNode(node.id, { videoUrl: vidData.url, status: 'complete', progress: 100 })
      return vidData.url as string
    }

    updateNode(node.id, { status: 'running', progress: 60 })
    const vidRes = await fetch(`${API_BASE}/image-to-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ imageUrl, prompt: d.prompt, aspectRatio, duration: d.duration || '5' }),
    })
    const vidData = await vidRes.json()
    if (!vidData.success || !vidData.url) throw new Error('video')
    updateNode(node.id, { videoUrl: vidData.url, status: 'complete', progress: 100 })
    return vidData.url as string
  }

  async function handleGenerate() {
    if (sceneNodes.length === 0 || isGenerating) return
    setIsGenerating(true)
    updateNode('output-final', { status: 'waiting', videoUrl: null, sceneCount: sceneNodes.length })

    let lastClip: string | null = null
    for (const node of sceneNodes) {
      try {
        lastClip = await processScene(node)
      } catch {
        updateNode(node.id, { status: 'error', progress: 0 })
      }
    }

    updateNode('output-final', { videoUrl: lastClip, status: lastClip ? 'complete' : 'idle' })
    setIsGenerating(false)
  }

  // ─── Add scene ───
  function addScene() {
    const id = `scene-${Date.now()}`
    const yPos = sceneNodes.length * 280
    const newIndex = sceneNodes.length
    setNodes((prev) => [
      ...prev,
      {
        id,
        type: 'scene',
        position: { x: 400, y: yPos },
        data: {
          title: `Escena ${newIndex + 1}`,
          prompt: '',
          duration: '5',
          imageUrl: null,
          videoUrl: null,
          status: 'idle',
          progress: 0,
          sceneIndex: newIndex,
          onUpdate: updateNode,
          onUpload: uploadImage,
          onDelete: deleteNode,
        } satisfies SceneNodeData,
      },
    ])
    // Auto-connect
    setEdges((prev) => [
      ...prev,
      { id: `e-prompt-${id}`, source: 'prompt-root', target: id, animated: true, style: { stroke: '#8b5cf6', strokeWidth: 2 } },
      { id: `e-${id}-output`, source: id, target: 'output-final', style: { stroke: '#22c55e', strokeWidth: 2 } },
    ])
  }

  // ─── Chat sidebar ───
  async function handleChatSend() {
    const msg = chatInput.trim()
    if (!msg || chatLoading) return
    setChatInput('')
    setChatMessages((prev) => [...prev, { role: 'user', text: msg }])
    setChatLoading(true)
    try {
      const context = `Workflow actual: ${sceneNodes.length} escenas. Aspecto: ${aspectRatio}. Escenas: ${sceneNodes.map((n) => `"${(n.data as SceneNodeData).title}" (${(n.data as SceneNodeData).duration}s)`).join(', ')}. Pregunta del usuario: ${msg}`
      const res = await fetch(`${API_BASE}/assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ message: context }),
      })
      const data = await res.json()
      if (data.scenes && data.nodes) {
        const graph = buildGraphFromDraft(data, prompt, aspectRatio, updateNode, uploadImage, deleteNode)
        setNodes(graph.nodes)
        setEdges(graph.edges)
        setDraft(data)
        if (data.aspectRatio) setAspectRatio(data.aspectRatio)
        setChatMessages((prev) => [...prev, { role: 'assistant', text: `Workflow actualizado con ${data.scenes.length} escenas.` }])
      } else {
        setChatMessages((prev) => [...prev, { role: 'assistant', text: 'No pude ajustar el workflow. Intenta ser mas especifico.' }])
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', text: 'Error de conexion. Intenta de nuevo.' }])
    }
    setChatLoading(false)
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  // ─── Render ───
  return (
    <div className="flex-1 flex flex-col bg-[#0a0a1a] min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-blue-600 flex items-center justify-center">
            <Film size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white/90">Places Video Workflow</p>
            <p className="text-[11px] text-white/45">
              {hasScenes
                ? `${sceneNodes.length} escena${sceneNodes.length > 1 ? 's' : ''} \u00b7 ${aspectRatio} \u00b7 Edita cada nodo directamente`
                : 'Describe tu video y construimos el workflow automaticamente'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasScenes && (
            <>
              <button
                onClick={addScene}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 text-white/50 hover:text-white/70 text-xs transition-colors"
                title="Agregar escena"
              >
                <Plus size={13} /> Escena
              </button>
              <button
                onClick={() => setChatOpen((prev) => !prev)}
                className={`p-2 rounded-xl transition-colors ${chatOpen ? 'bg-[#8b5cf6]/20 text-[#c4b5fd]' : 'bg-white/5 text-white/50 hover:text-white/70'}`}
                title="Chat del workflow"
              >
                <MessageSquare size={16} />
              </button>
            </>
          )}
          {onShowChat && (
            <button
              onClick={onShowChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 text-white/50 hover:text-white/70 text-xs transition-colors"
              title="Abrir chat principal"
            >
              <MessageSquare size={13} /> Chat
            </button>
          )}
          <button onClick={onClose} className="text-white/50 hover:text-white/70">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Canvas area */}
        <div className="flex-1 overflow-hidden">
          {/* Empty state */}
          {!hasScenes && !isAssisting && (
            <div className="h-full flex flex-col items-center justify-center gap-4 px-6 text-center">
              <div className="w-20 h-20 rounded-[28px] bg-white/[0.04] border border-white/10 flex items-center justify-center">
                <Clapperboard size={36} className="text-[#a78bfa]" />
              </div>
              <div className="max-w-xl">
                <p className="text-lg font-semibold text-white/90">Escribe tu idea y construimos el workflow.</p>
                <p className="mt-2 text-sm text-white/45">
                  Cada paso aparece como un nodo en el canvas. Edita cualquier nodo haciendo click.
                </p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isAssisting && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-white/45">
              <Loader2 size={32} className="animate-spin text-[#a78bfa]" />
              <p className="text-sm">Construyendo workflow...</p>
            </div>
          )}

          {/* Unified canvas with custom nodes */}
          {hasScenes && (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              minZoom={0.3}
              maxZoom={1.5}
              className="bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.08),_transparent_40%),linear-gradient(180deg,#090910,#0d1020)]"
              proOptions={{ hideAttribution: true }}
            >
              <MiniMap
                pannable
                zoomable
                style={{ background: '#12121f' }}
                maskColor="rgba(0,0,0,0.6)"
                nodeColor={(n) => {
                  if (n.type === 'prompt') return '#f59e0b'
                  if (n.type === 'output') return '#22c55e'
                  return '#8b5cf6'
                }}
              />
              <Controls
                showInteractive={false}
                style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
              />
              <Background color="rgba(255,255,255,0.04)" gap={24} />
            </ReactFlow>
          )}
        </div>

        {/* Chat sidebar */}
        {chatOpen && (
          <div className="w-80 border-l border-white/10 bg-[#0c0c1e] flex flex-col">
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <MessageSquare size={14} className="text-[#a78bfa]" />
              <span className="text-xs font-semibold text-white/80">Asistente del Workflow</span>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {chatMessages.length === 0 && (
                <div className="mt-8 space-y-3">
                  <p className="text-[11px] text-white/30 text-center">
                    Pide ajustes al workflow con lenguaje natural.
                  </p>
                  <div className="space-y-1.5">
                    {[
                      'Agrega una escena de cierre con CTA',
                      'Cambia el estilo a cinematografico',
                      'Haz las escenas de 3 segundos',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setChatInput(suggestion)
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[11px] text-white/50 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs ${
                      msg.role === 'user' ? 'bg-[#8b5cf6]/20 text-white/85' : 'bg-white/[0.06] text-white/70'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded-2xl bg-white/[0.06]">
                    <Loader2 size={14} className="animate-spin text-[#a78bfa]" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="border-t border-white/10 px-3 py-2.5">
              <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
                  placeholder="Ajustar workflow..."
                  className="flex-1 bg-transparent text-xs text-white/80 outline-none placeholder:text-white/30"
                />
                <button
                  onClick={handleChatSend}
                  disabled={!chatInput.trim() || chatLoading}
                  className="text-[#a78bfa] disabled:opacity-30"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom prompt bar */}
      <div className="border-t border-white/10 bg-[#0e0e22] px-4 py-3">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end gap-3 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3">
            <div className="flex-1">
              <textarea
                ref={promptRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={2}
                className="w-full bg-transparent text-white/80 text-sm resize-none outline-none leading-relaxed"
                placeholder="Describe tu video: Reel vertical para cafeteria con hook fuerte, oferta y cierre con CTA..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    !hasScenes ? handleAssist() : handleGenerate()
                  }
                }}
              />
              <div className="flex items-center gap-2 mt-2">
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                  className="bg-white/[0.06] border border-white/[0.06] text-white/50 text-[11px] rounded-lg px-2.5 py-1.5 outline-none"
                >
                  <option value="16:9">16:9 Horizontal</option>
                  <option value="9:16">9:16 Vertical</option>
                  <option value="1:1">1:1 Cuadrado</option>
                </select>
                {hasScenes && <span className="text-[11px] text-white/30">{sceneNodes.length} escenas</span>}
              </div>
            </div>
            {!hasScenes ? (
              <button
                onClick={handleAssist}
                disabled={!prompt.trim() || isAssisting}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-[#8b5cf6] disabled:opacity-40 text-white text-sm font-medium rounded-xl flex-shrink-0"
              >
                {isAssisting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                Crear
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-[#8b5cf6] to-blue-600 disabled:opacity-40 text-white text-sm font-medium rounded-xl flex-shrink-0"
              >
                {isGenerating ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                Generar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
