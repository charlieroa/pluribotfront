import { useState } from 'react'
import { History, RotateCcw, Plus, Minus, FileEdit } from 'lucide-react'
import type { ArtifactVersion, ProjectArtifact } from '../../types'

interface VersionHistoryProps {
  versions: ArtifactVersion[]
  currentVersionId: number | null
  onRestore: (version: ArtifactVersion) => void
  onClose: () => void
  currentArtifact?: ProjectArtifact
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

interface DiffSummary {
  added: string[]
  removed: string[]
  modified: { path: string; linesAdded: number; linesRemoved: number }[]
}

function computeDiff(versionArtifact: ProjectArtifact, currentArtifact: ProjectArtifact): DiffSummary {
  const versionPaths = new Set(versionArtifact.files.map(f => f.filePath))
  const currentPaths = new Set(currentArtifact.files.map(f => f.filePath))

  const added: string[] = []
  const removed: string[] = []
  const modified: DiffSummary['modified'] = []

  // Files in current but not in version = added since that version
  for (const f of currentArtifact.files) {
    if (!versionPaths.has(f.filePath)) {
      added.push(f.filePath)
    }
  }

  // Files in version but not in current = removed since that version
  for (const f of versionArtifact.files) {
    if (!currentPaths.has(f.filePath)) {
      removed.push(f.filePath)
    }
  }

  // Files in both — check if content differs
  for (const vf of versionArtifact.files) {
    const cf = currentArtifact.files.find(f => f.filePath === vf.filePath)
    if (cf && cf.content !== vf.content) {
      const vLines = vf.content.split('\n').length
      const cLines = cf.content.split('\n').length
      const delta = cLines - vLines
      modified.push({
        path: vf.filePath,
        linesAdded: delta > 0 ? delta : 0,
        linesRemoved: delta < 0 ? Math.abs(delta) : 0,
      })
    }
  }

  return { added, removed, modified }
}

export default function VersionHistory({ versions, currentVersionId, onRestore, onClose, currentArtifact }: VersionHistoryProps) {
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null)

  if (versions.length === 0) {
    return (
      <div className="w-56 bg-[#1e1e2e] border-l border-slate-700/50 flex flex-col">
        <div className="px-3 py-2 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <History size={12} /> Versiones
          </div>
          <button onClick={onClose} className="text-[10px] text-slate-500 hover:text-white">Cerrar</button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-[11px] text-slate-500 text-center">No hay versiones guardadas aun</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-56 bg-[#1e1e2e] border-l border-slate-700/50 flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-700/50 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          <History size={12} /> Versiones
        </div>
        <button onClick={onClose} className="text-[10px] text-slate-500 hover:text-white transition-colors">
          Cerrar
        </button>
      </div>

      {/* Version list */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {[...versions].reverse().map((v) => {
          const isCurrent = v.id === currentVersionId
          const isExpanded = expandedVersion === v.id
          const diff = !isCurrent && currentArtifact
            ? computeDiff(v.artifact, currentArtifact)
            : null
          const totalChanges = diff
            ? diff.added.length + diff.removed.length + diff.modified.length
            : 0

          return (
            <div
              key={v.id}
              className={`px-3 py-2 border-b border-slate-800/50 ${
                isCurrent ? 'bg-indigo-500/10' : 'hover:bg-slate-800/30'
              } transition-colors`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-300 truncate flex-1">
                  {v.label}
                </span>
                {isCurrent && (
                  <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded ml-1 flex-shrink-0">
                    Actual
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-slate-500">{formatTime(v.timestamp)}</span>
                {!isCurrent && (
                  <button
                    onClick={() => onRestore(v)}
                    className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <RotateCcw size={10} /> Restaurar
                  </button>
                )}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-600">
                {v.artifact.files.length} archivos
              </div>

              {/* Diff summary */}
              {diff && totalChanges > 0 && (
                <button
                  onClick={() => setExpandedVersion(isExpanded ? null : v.id)}
                  className="mt-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  {totalChanges} cambio{totalChanges !== 1 ? 's' : ''} vs actual
                  {isExpanded ? ' ▴' : ' ▾'}
                </button>
              )}

              {isExpanded && diff && (
                <div className="mt-1.5 space-y-0.5">
                  {diff.added.map(p => (
                    <div key={`a-${p}`} className="flex items-center gap-1 text-[9px] text-emerald-400">
                      <Plus size={8} />
                      <span className="truncate">{p.split('/').pop()}</span>
                    </div>
                  ))}
                  {diff.removed.map(p => (
                    <div key={`r-${p}`} className="flex items-center gap-1 text-[9px] text-red-400">
                      <Minus size={8} />
                      <span className="truncate">{p.split('/').pop()}</span>
                    </div>
                  ))}
                  {diff.modified.map(m => (
                    <div key={`m-${m.path}`} className="flex items-center gap-1 text-[9px] text-amber-400">
                      <FileEdit size={8} />
                      <span className="truncate">{m.path.split('/').pop()}</span>
                      <span className="text-slate-600 ml-auto flex-shrink-0">
                        {m.linesAdded > 0 && <span className="text-emerald-500">+{m.linesAdded}</span>}
                        {m.linesAdded > 0 && m.linesRemoved > 0 && ' '}
                        {m.linesRemoved > 0 && <span className="text-red-500">-{m.linesRemoved}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
