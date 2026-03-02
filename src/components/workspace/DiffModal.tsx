import { useState, useMemo } from 'react'
import { X } from 'lucide-react'

interface DiffLine {
  type: 'add' | 'remove' | 'same'
  content: string
  lineOld?: number
  lineNew?: number
}

interface DiffModalProps {
  open: boolean
  onClose: () => void
  oldVersion: number
  newVersion: number
  oldContent: string
  newContent: string
  type: string
}

const MAX_LINES = 1000

function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n').slice(0, MAX_LINES)
  const newLines = newText.split('\n').slice(0, MAX_LINES)
  const m = oldLines.length
  const n = newLines.length

  // O(n) space LCS using two rows
  const prev = new Uint16Array(n + 1)
  const curr = new Uint16Array(n + 1)

  // We need full table for backtracking, so use direction matrix
  // 0=diag, 1=up, 2=left
  const dir = new Uint8Array(m * n)

  for (let i = 1; i <= m; i++) {
    prev.set(curr)
    curr.fill(0)
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        curr[j] = prev[j - 1] + 1
        dir[(i - 1) * n + (j - 1)] = 0
      } else if (prev[j] >= curr[j - 1]) {
        curr[j] = prev[j]
        dir[(i - 1) * n + (j - 1)] = 1
      } else {
        curr[j] = curr[j - 1]
        dir[(i - 1) * n + (j - 1)] = 2
      }
    }
  }

  // Backtrack
  const temp: DiffLine[] = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dir[(i - 1) * n + (j - 1)] === 0) {
      temp.push({ type: 'same', content: oldLines[i - 1], lineOld: i, lineNew: j })
      i--; j--
    } else if (i > 0 && (j === 0 || (dir[(i - 1) * n + (j > 0 ? j - 1 : 0)] === 1))) {
      temp.push({ type: 'remove', content: oldLines[i - 1], lineOld: i })
      i--
    } else {
      temp.push({ type: 'add', content: newLines[j - 1], lineNew: j })
      j--
    }
  }

  return temp.reverse()
}

function parseCodeFiles(content: string): Record<string, string> | null {
  try {
    const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    const json = fenceMatch ? JSON.parse(fenceMatch[1].trim()) : JSON.parse(content.trim())
    return json.files || null
  } catch {
    const start = content.indexOf('{')
    if (start >= 0) {
      let depth = 0, end = -1
      for (let k = start; k < content.length; k++) {
        if (content[k] === '{') depth++
        else if (content[k] === '}') { depth--; if (depth === 0) { end = k; break } }
      }
      if (end > start) {
        try {
          const parsed = JSON.parse(content.slice(start, end + 1))
          return parsed.files || null
        } catch { return null }
      }
    }
    return null
  }
}

const DiffModal = ({ open, onClose, oldVersion, newVersion, oldContent, newContent, type }: DiffModalProps) => {
  const [activeFile, setActiveFile] = useState<string | null>(null)

  const { isCode, oldFiles, newFiles, allPaths } = useMemo(() => {
    if (type !== 'code') return { isCode: false, oldFiles: null, newFiles: null, allPaths: [] as string[] }
    const of = parseCodeFiles(oldContent)
    const nf = parseCodeFiles(newContent)
    if (!of || !nf) return { isCode: false, oldFiles: null, newFiles: null, allPaths: [] as string[] }
    const paths = [...new Set([...Object.keys(of), ...Object.keys(nf)])].sort()
    return { isCode: true, oldFiles: of, newFiles: nf, allPaths: paths }
  }, [oldContent, newContent, type])

  const selected = activeFile || allPaths[0] || ''

  const diff = useMemo(() => {
    if (isCode && oldFiles && newFiles) {
      return computeLineDiff(oldFiles[selected] || '', newFiles[selected] || '')
    }
    return computeLineDiff(oldContent, newContent)
  }, [isCode, oldFiles, newFiles, selected, oldContent, newContent])

  const stats = useMemo(() => {
    let added = 0, removed = 0
    for (const line of diff) {
      if (line.type === 'add') added++
      else if (line.type === 'remove') removed++
    }
    return { added, removed }
  }, [diff])

  if (!open) return null

  const renderDiffTable = () => (
    <table className="w-full text-[11px] font-mono border-collapse">
      <tbody>
        {diff.map((line, i) => (
          <tr key={i} className={
            line.type === 'add' ? 'bg-emerald-950/40' :
            line.type === 'remove' ? 'bg-red-950/40' : ''
          }>
            <td className="w-10 text-right px-2 text-slate-600 select-none border-r border-slate-800">
              {line.lineOld || ''}
            </td>
            <td className="w-10 text-right px-2 text-slate-600 select-none border-r border-slate-800">
              {line.lineNew || ''}
            </td>
            <td className={`w-5 text-center select-none ${
              line.type === 'add' ? 'text-emerald-400' :
              line.type === 'remove' ? 'text-red-400' : 'text-slate-600'
            }`}>
              {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
            </td>
            <td className={`px-2 whitespace-pre ${
              line.type === 'add' ? 'text-emerald-300' :
              line.type === 'remove' ? 'text-red-300' : 'text-slate-400'
            }`}>
              {line.content}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      <div className="h-11 px-4 flex items-center justify-between bg-slate-900 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-300">
            v{oldVersion} → v{newVersion}
          </span>
          <span className="text-[10px] text-emerald-400">+{stats.added}</span>
          <span className="text-[10px] text-red-400">-{stats.removed}</span>
        </div>
        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {isCode && allPaths.length > 0 && (
          <div className="w-56 border-r border-slate-700 overflow-y-auto flex-shrink-0 bg-slate-900/50">
            {allPaths.map(path => {
              const changed = (oldFiles?.[path] || '') !== (newFiles?.[path] || '')
              const isNew = !oldFiles?.[path]
              const isDeleted = !newFiles?.[path]
              return (
                <button
                  key={path}
                  onClick={() => setActiveFile(path)}
                  className={`w-full text-left px-3 py-1.5 text-[11px] font-mono truncate transition-colors flex items-center gap-1.5 ${
                    path === selected ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  {isNew && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />}
                  {isDeleted && <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />}
                  {changed && !isNew && !isDeleted && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />}
                  {!changed && <span className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0" />}
                  <span className="truncate">{path}</span>
                </button>
              )
            })}
          </div>
        )}

        <div className="flex-1 overflow-auto custom-scrollbar">
          {renderDiffTable()}
        </div>
      </div>
    </div>
  )
}

export default DiffModal
