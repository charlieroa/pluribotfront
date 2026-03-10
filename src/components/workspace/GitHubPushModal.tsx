import { useMemo, useState } from 'react'
import { Github, ExternalLink, X, RefreshCw, CheckCircle2, FolderGit2 } from 'lucide-react'
import type { Deliverable } from '../../types'
import type { ProjectFile } from './WebContainerPreview'

interface GitHubPushModalProps {
  isOpen: boolean
  onClose: () => void
  deliverable: Deliverable
  projectFiles?: ProjectFile[]
}

const GitHubPushModal = ({ isOpen, onClose, deliverable, projectFiles }: GitHubPushModalProps) => {
  const [repoName, setRepoName] = useState(
    deliverable.title.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase().slice(0, 40)
  )
  const [commitMessage, setCommitMessage] = useState(`Update: ${deliverable.title}`)
  const [createNew, setCreateNew] = useState(true)
  const [pushing, setPushing] = useState(false)
  const [result, setResult] = useState<{ repoUrl: string; fileCount?: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fileCount = useMemo(() => {
    if (projectFiles && projectFiles.length > 0) return projectFiles.length
    try {
      const parsed = JSON.parse(deliverable.content)
      return Array.isArray(parsed) ? parsed.length : 1
    } catch {
      return 1
    }
  }, [deliverable.content, projectFiles])

  if (!isOpen) return null

  const handlePush = async () => {
    setPushing(true)
    setError(null)
    setResult(null)

    try {
      const resp = await fetch('/api/github/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('plury_token')}`,
        },
        body: JSON.stringify({
          deliverableId: deliverable.id,
          repoName,
          commitMessage,
          createNew,
          files: projectFiles,
        }),
      })

      const data = await resp.json()
      if (!resp.ok) {
        setError(data.error || 'Failed to push')
      } else {
        setResult(data)
      }
    } catch {
      setError('Network error')
    } finally {
      setPushing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-4 w-full max-w-lg overflow-hidden rounded-2xl border border-edge bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-edge px-5 py-4">
          <div className="flex items-center gap-2">
            <Github size={18} className="text-ink" />
            <div>
              <h3 className="text-sm font-bold text-ink">Publicar en GitHub</h3>
              <p className="text-[11px] text-ink-faint">Empuja el proyecto actual del workspace</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-faint transition-colors hover:text-ink">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {result ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">Repositorio actualizado</p>
                <p className="mt-1 text-xs text-ink-faint">
                  {result.fileCount ?? fileCount} archivos enviados correctamente.
                </p>
              </div>
              <a
                href={result.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                <ExternalLink size={14} /> Ver en GitHub
              </a>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-edge bg-subtle/50 p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-ink">
                  <FolderGit2 size={14} />
                  Proyecto listo para exportar
                </div>
                <p className="mt-1 text-xs text-ink-faint">
                  Se enviarán {fileCount} archivos desde el workspace actual. Si hiciste cambios locales, también se incluyen.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-ink-faint">Nombre del repositorio</label>
                <input
                  type="text"
                  value={repoName}
                  onChange={e => setRepoName(e.target.value)}
                  className="w-full rounded-lg border border-edge bg-subtle px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="mi-proyecto"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setCreateNew(true)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    createNew ? 'border-primary bg-primary/5 text-primary' : 'border-edge text-ink-faint hover:text-ink'
                  }`}
                >
                  Crear repo
                </button>
                <button
                  onClick={() => setCreateNew(false)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    !createNew ? 'border-primary bg-primary/5 text-primary' : 'border-edge text-ink-faint hover:text-ink'
                  }`}
                >
                  Usar existente
                </button>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-ink-faint">Mensaje de commit</label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={e => setCommitMessage(e.target.value)}
                  className="w-full rounded-lg border border-edge bg-subtle px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-500/10 p-2 text-xs text-red-500">{error}</p>
              )}

              <button
                onClick={handlePush}
                disabled={!repoName || pushing}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {pushing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Enviando...
                  </>
                ) : (
                  <>
                    <Github size={14} /> Enviar a GitHub
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default GitHubPushModal
