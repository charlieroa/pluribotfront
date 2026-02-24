import { useState, useEffect } from 'react'
import { X, Github, Loader2, Check, AlertTriangle } from 'lucide-react'
import type { ProjectArtifact } from '../../types'

interface GitHubPushModalProps {
  artifact: ProjectArtifact
  onClose: () => void
}

const TOKEN_KEY = 'pluribots_gh_token'
const REPO_KEY = 'pluribots_gh_repo'

export default function GitHubPushModal({ artifact, onClose }: GitHubPushModalProps) {
  const [repoUrl, setRepoUrl] = useState('')
  const [token, setToken] = useState('')
  const [commitMessage, setCommitMessage] = useState(`Add ${artifact.title}`)
  const [branch, setBranch] = useState('main')
  const [status, setStatus] = useState<'idle' | 'pushing' | 'success' | 'error'>('idle')
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY)
    const savedRepo = localStorage.getItem(REPO_KEY)
    if (savedToken) setToken(savedToken)
    if (savedRepo) setRepoUrl(savedRepo)
  }, [])

  const handlePush = async () => {
    setStatus('pushing')
    setErrorMsg(null)

    // Save for convenience
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(REPO_KEY, repoUrl)

    try {
      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl,
          token,
          files: artifact.files.map(f => ({ filePath: f.filePath, content: f.content })),
          commitMessage,
          branch,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setStatus('success')
        setResultUrl(data.commitUrl)
      } else {
        setStatus('error')
        setErrorMsg(data.error || 'Unknown error')
      }
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Network error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1e1e2e] border border-slate-700/50 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/50">
          <div className="flex items-center gap-2">
            <Github size={18} className="text-white" />
            <h3 className="text-sm font-semibold text-white">Push to GitHub</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Repositorio</label>
            <input
              type="text"
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              placeholder="owner/repo o https://github.com/owner/repo"
              className="w-full px-3 py-2 text-xs bg-[#0d1117] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Personal Access Token</label>
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="ghp_..."
              className="w-full px-3 py-2 text-xs bg-[#0d1117] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[10px] text-slate-600 mt-1">Se guarda en localStorage para conveniencia</p>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Branch</label>
              <input
                type="text"
                value={branch}
                onChange={e => setBranch(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#0d1117] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Commit message</label>
            <input
              type="text"
              value={commitMessage}
              onChange={e => setCommitMessage(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#0d1117] border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Status feedback */}
          {status === 'success' && resultUrl && (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <Check size={14} className="text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-[11px] text-emerald-300">Push exitoso</p>
                <a href={resultUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-400 underline break-all">
                  {resultUrl}
                </a>
              </div>
            </div>
          )}
          {status === 'error' && errorMsg && (
            <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
              <p className="text-[11px] text-red-300">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-700/50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handlePush}
            disabled={!repoUrl || !token || !commitMessage || status === 'pushing'}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'pushing' ? <Loader2 size={12} className="animate-spin" /> : <Github size={12} />}
            {status === 'pushing' ? 'Pushing...' : 'Push'}
          </button>
        </div>
      </div>
    </div>
  )
}
