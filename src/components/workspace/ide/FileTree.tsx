import { useState } from 'react'
import { ChevronRight, ChevronDown, FileCode2, FileJson, FileType, File, FolderOpen, Folder } from 'lucide-react'
import type { FileEntry } from '../../../hooks/useWebContainer'

interface FileTreeProps {
  files: FileEntry[]
  activeFile: string | null
  onFileSelect: (path: string) => void
}

function getFileIcon(name: string) {
  if (name.endsWith('.tsx') || name.endsWith('.ts') || name.endsWith('.jsx') || name.endsWith('.js'))
    return <FileCode2 size={14} className="text-blue-400 flex-shrink-0" />
  if (name.endsWith('.json'))
    return <FileJson size={14} className="text-yellow-400 flex-shrink-0" />
  if (name.endsWith('.css'))
    return <FileType size={14} className="text-purple-400 flex-shrink-0" />
  if (name.endsWith('.html'))
    return <FileType size={14} className="text-orange-400 flex-shrink-0" />
  return <File size={14} className="text-gray-400 flex-shrink-0" />
}

function TreeNode({ entry, depth, activeFile, onFileSelect }: { entry: FileEntry; depth: number; activeFile: string | null; onFileSelect: (path: string) => void }) {
  const [expanded, setExpanded] = useState(depth < 2) // auto-expand first 2 levels

  if (entry.type === 'directory') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-1 py-1 px-1 hover:bg-white/5 rounded text-xs text-gray-300"
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
        >
          {expanded ? <ChevronDown size={12} className="flex-shrink-0" /> : <ChevronRight size={12} className="flex-shrink-0" />}
          {expanded ? <FolderOpen size={14} className="text-amber-400 flex-shrink-0" /> : <Folder size={14} className="text-amber-400 flex-shrink-0" />}
          <span className="truncate">{entry.name}</span>
        </button>
        {expanded && entry.children?.map((child) => (
          <TreeNode key={child.path} entry={child} depth={depth + 1} activeFile={activeFile} onFileSelect={onFileSelect} />
        ))}
      </div>
    )
  }

  const isActive = activeFile === entry.path
  return (
    <button
      onClick={() => onFileSelect(entry.path)}
      className={`w-full flex items-center gap-1.5 py-1 px-1 rounded text-xs truncate ${
        isActive ? 'bg-indigo-500/20 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
      }`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      {getFileIcon(entry.name)}
      <span className="truncate">{entry.name}</span>
    </button>
  )
}

export default function FileTree({ files, activeFile, onFileSelect }: FileTreeProps) {
  return (
    <div className="py-1 overflow-y-auto h-full custom-scrollbar">
      {files.map((entry) => (
        <TreeNode key={entry.path} entry={entry} depth={0} activeFile={activeFile} onFileSelect={onFileSelect} />
      ))}
    </div>
  )
}
