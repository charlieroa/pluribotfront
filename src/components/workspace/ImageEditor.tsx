import { useState, useRef, useEffect, useCallback } from 'react'
import { Paintbrush, Eraser, Undo2, RotateCcw, Send, X, Loader2, ZoomIn, ZoomOut, Download } from 'lucide-react'

interface ImageEditorProps {
  imageUrl: string
  onClose: () => void
  onImageEdited?: (newImageUrl: string) => void
}

const BRUSH_SIZES = [10, 20, 40, 70]

const ImageEditor = ({ imageUrl, onClose, onImageEdited }: ImageEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushSize, setBrushSize] = useState(20)
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush')
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [history, setHistory] = useState<ImageData[]>([])
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [hasMask, setHasMask] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)

  // Load the image
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imgRef.current = img

      const canvas = canvasRef.current
      const maskCanvas = maskCanvasRef.current
      if (!canvas || !maskCanvas) return

      // Scale to fit container while preserving aspect ratio
      const maxW = 800
      const maxH = 600
      let w = img.naturalWidth
      let h = img.naturalHeight
      if (w > maxW) { h = (h * maxW) / w; w = maxW }
      if (h > maxH) { w = (w * maxH) / h; h = maxH }

      canvas.width = w
      canvas.height = h
      maskCanvas.width = w
      maskCanvas.height = h

      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)

      // Init mask as white (non-edited areas)
      const maskCtx = maskCanvas.getContext('2d')!
      maskCtx.fillStyle = 'white'
      maskCtx.fillRect(0, 0, w, h)

      setImageLoaded(true)
    }
    img.onerror = () => setError('No se pudo cargar la imagen')
    img.src = imageUrl
  }, [imageUrl])

  // Redraw the composite (image + mask overlay)
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const maskCanvas = maskCanvasRef.current
    const img = imgRef.current
    if (!canvas || !maskCanvas || !img) return

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    // Draw mask overlay with semi-transparent magenta
    ctx.save()
    ctx.globalAlpha = 0.4
    const maskCtx = maskCanvas.getContext('2d')!
    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)

    // Create a temp canvas for the overlay
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.width
    tempCanvas.height = canvas.height
    const tempCtx = tempCanvas.getContext('2d')!
    const overlayData = tempCtx.createImageData(canvas.width, canvas.height)

    for (let i = 0; i < maskData.data.length; i += 4) {
      // Black in mask = area to edit → show magenta overlay
      if (maskData.data[i] < 128) {
        overlayData.data[i] = 168     // R
        overlayData.data[i + 1] = 85  // G
        overlayData.data[i + 2] = 247 // B
        overlayData.data[i + 3] = 180 // A
      } else {
        overlayData.data[i + 3] = 0
      }
    }

    tempCtx.putImageData(overlayData, 0, 0)
    ctx.globalAlpha = 1
    ctx.drawImage(tempCanvas, 0, 0)
    ctx.restore()
  }, [])

  // Save mask state for undo
  const saveMaskState = useCallback(() => {
    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return
    const maskCtx = maskCanvas.getContext('2d')!
    const data = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height)
    setHistory(prev => [...prev.slice(-20), data])
  }, [])

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const paint = useCallback((x: number, y: number) => {
    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return
    const maskCtx = maskCanvas.getContext('2d')!

    maskCtx.globalCompositeOperation = 'source-over'
    maskCtx.beginPath()
    maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2)

    if (tool === 'brush') {
      maskCtx.fillStyle = 'black' // Black = area to edit
    } else {
      maskCtx.fillStyle = 'white' // White = keep
    }
    maskCtx.fill()

    setHasMask(true)
    redraw()
  }, [brushSize, tool, redraw])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    saveMaskState()
    setIsDrawing(true)
    const pos = getCanvasPos(e)
    paint(pos.x, pos.y)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const pos = getCanvasPos(e)
    paint(pos.x, pos.y)
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
  }

  const handleUndo = () => {
    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas || history.length === 0) return
    const maskCtx = maskCanvas.getContext('2d')!
    const prev = history[history.length - 1]
    maskCtx.putImageData(prev, 0, 0)
    setHistory(h => h.slice(0, -1))
    redraw()
  }

  const handleClearMask = () => {
    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return
    saveMaskState()
    const maskCtx = maskCanvas.getContext('2d')!
    maskCtx.fillStyle = 'white'
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height)
    setHasMask(false)
    redraw()
  }

  const handleSubmit = async () => {
    if (!prompt.trim() || !hasMask) return

    const maskCanvas = maskCanvasRef.current
    if (!maskCanvas) return

    setIsLoading(true)
    setError(null)

    try {
      // Convert mask canvas to blob
      const maskBlob = await new Promise<Blob>((resolve, reject) => {
        maskCanvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Failed to create mask')), 'image/png')
      })

      // Upload mask
      const maskForm = new FormData()
      maskForm.append('image', maskBlob, 'mask.png')
      const maskRes = await fetch('/api/upload', { method: 'POST', body: maskForm })
      if (!maskRes.ok) throw new Error('Error subiendo mascara')
      const { url: maskUrl } = await maskRes.json()

      // Call edit endpoint
      const token = localStorage.getItem('plury_token')
      const editRes = await fetch('/api/image/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          imageUrl,
          maskUrl,
          prompt,
        }),
      })

      if (!editRes.ok) {
        const errData = await editRes.json().catch(() => ({}))
        throw new Error(errData.error || 'Error al editar imagen')
      }

      const data = await editRes.json()
      if (data.url) {
        setResultUrl(data.url)
        onImageEdited?.(data.url)
      } else {
        throw new Error(data.error || 'No se recibio imagen editada')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }

  // Load result into editor for further editing
  const handleContinueEditing = () => {
    if (!resultUrl) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imgRef.current = img
      const canvas = canvasRef.current
      const maskCanvas = maskCanvasRef.current
      if (!canvas || !maskCanvas) return

      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      const maskCtx = maskCanvas.getContext('2d')!
      maskCtx.fillStyle = 'white'
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height)

      setHasMask(false)
      setHistory([])
      setResultUrl(null)
      setPrompt('')
      redraw()
    }
    img.src = resultUrl
  }

  return (
    <div className="flex-1 flex flex-col bg-surface overflow-hidden">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-edge flex-shrink-0">
        <div className="flex items-center gap-3">
          <Paintbrush size={16} className="text-primary" />
          <span className="text-sm font-bold text-ink">Editor de imagen</span>
        </div>
        <button onClick={onClose} className="p-1.5 text-ink-faint hover:text-ink rounded-lg hover:bg-subtle transition-all">
          <X size={16} />
        </button>
      </div>

      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-edge flex items-center gap-3 flex-wrap">
        {/* Tools */}
        <div className="flex bg-subtle rounded-lg p-0.5">
          <button
            onClick={() => setTool('brush')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-all ${
              tool === 'brush' ? 'bg-primary text-white shadow-sm' : 'text-ink-faint hover:text-ink'
            }`}
            title="Pintar zona a editar"
          >
            <Paintbrush size={13} /> Pintar
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md transition-all ${
              tool === 'eraser' ? 'bg-primary text-white shadow-sm' : 'text-ink-faint hover:text-ink'
            }`}
            title="Borrar zona pintada"
          >
            <Eraser size={13} /> Borrar
          </button>
        </div>

        {/* Brush size */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-ink-faint font-medium">Tamano:</span>
          {BRUSH_SIZES.map(size => (
            <button
              key={size}
              onClick={() => setBrushSize(size)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                brushSize === size ? 'bg-primary/15 ring-1 ring-primary' : 'bg-subtle hover:bg-surface-alt'
              }`}
              title={`${size}px`}
            >
              <div
                className={`rounded-full ${brushSize === size ? 'bg-primary' : 'bg-ink-faint'}`}
                style={{ width: Math.max(4, size / 4), height: Math.max(4, size / 4) }}
              />
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-edge" />

        {/* Actions */}
        <button
          onClick={handleUndo}
          disabled={history.length === 0}
          className="p-1.5 text-ink-faint hover:text-ink disabled:opacity-30 rounded-lg hover:bg-subtle transition-all"
          title="Deshacer"
        >
          <Undo2 size={14} />
        </button>
        <button
          onClick={handleClearMask}
          className="p-1.5 text-ink-faint hover:text-ink rounded-lg hover:bg-subtle transition-all"
          title="Limpiar mascara"
        >
          <RotateCcw size={14} />
        </button>

        <div className="w-px h-5 bg-edge" />

        {/* Zoom */}
        <button
          onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
          className="p-1.5 text-ink-faint hover:text-ink rounded-lg hover:bg-subtle transition-all"
        >
          <ZoomOut size={14} />
        </button>
        <span className="text-[10px] text-ink-faint font-mono w-8 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(z => Math.min(3, z + 0.25))}
          className="p-1.5 text-ink-faint hover:text-ink rounded-lg hover:bg-subtle transition-all"
        >
          <ZoomIn size={14} />
        </button>
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-[#0a0a1a] flex items-center justify-center p-4">
        {!imageLoaded && !error && (
          <div className="flex flex-col items-center gap-3 text-ink-faint">
            <Loader2 size={24} className="animate-spin" />
            <span className="text-xs">Cargando imagen...</span>
          </div>
        )}
        {error && !isLoading && (
          <div className="text-center">
            <p className="text-sm text-red-400 mb-2">{error}</p>
            <button onClick={() => setError(null)} className="text-xs text-primary hover:underline">Reintentar</button>
          </div>
        )}

        <div className="relative" style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
          {/* Result comparison */}
          {resultUrl ? (
            <div className="flex gap-4 items-start">
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-bold text-ink-faint/50 uppercase tracking-wider">Original</span>
                <img src={imageUrl} alt="Original" className="max-h-[60vh] rounded-lg shadow-xl" />
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider">Editado</span>
                <img src={resultUrl} alt="Editado" className="max-h-[60vh] rounded-lg shadow-xl ring-2 ring-emerald-500/30" />
              </div>
            </div>
          ) : (
            <>
              <canvas
                ref={canvasRef}
                className={`rounded-lg shadow-2xl ${imageLoaded ? '' : 'hidden'}`}
                style={{ cursor: tool === 'brush' ? 'crosshair' : 'cell' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
              {/* Hidden mask canvas */}
              <canvas ref={maskCanvasRef} className="hidden" />
            </>
          )}
        </div>
      </div>

      {/* Bottom bar — prompt + submit */}
      <div className="px-4 py-3 border-t border-edge bg-surface">
        {resultUrl ? (
          <div className="flex items-center gap-3">
            <button
              onClick={handleContinueEditing}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-all"
            >
              <Paintbrush size={14} />
              Seguir editando
            </button>
            <a
              href={resultUrl}
              download
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-subtle text-ink rounded-xl font-semibold text-sm hover:bg-surface-alt transition-all"
            >
              <Download size={14} />
              Descargar
            </a>
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-ink-faint hover:text-ink text-sm font-medium transition-colors"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
                placeholder={hasMask ? 'Describe que quieres cambiar en la zona pintada...' : 'Primero pinta la zona que quieres editar'}
                disabled={!hasMask || isLoading}
                className="w-full bg-subtle rounded-xl px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint/40 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-40"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || !hasMask || isLoading}
              className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:opacity-90 disabled:opacity-20 transition-all"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        )}

        {isLoading && (
          <p className="text-[11px] text-primary mt-2 text-center animate-pulse">
            Editando imagen con IA... esto puede tomar unos segundos
          </p>
        )}
      </div>
    </div>
  )
}

export default ImageEditor
