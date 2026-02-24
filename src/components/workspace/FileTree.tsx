import { useState } from 'react'
import { ChevronRight, ChevronDown, FileText, FileCode, FileJson, FileType, Image, File } from 'lucide-react'
import type { ArtifactFile } from '../../types'

interface FileTreeProps {
  files: ArtifactFile[]
  activeFile: string | null
  onSelectFile: (filePath: string) => void
}

interface TreeNode {
  name: string
  path: string
  isDir: boolean
  children: TreeNode[]
  file?: ArtifactFile
}

function buildTree(files: ArtifactFile[]): TreeNode[] {
  const root: TreeNode[] = []

  for (const file of files) {
    const parts = file.filePath.split('/')
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]
      const path = parts.slice(0, i + 1).join('/')
      const isDir = i < parts.length - 1

      let node = current.find(n => n.name === name && n.isDir === isDir)
      if (!node) {
        node = { name, path, isDir, children: [], file: isDir ? undefined : file }
        current.push(node)
      }
      current = node.children
    }
  }

  // Sort: dirs first, then files alphabetically
  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1
      if (!a.isDir && b.isDir) return 1
      return a.name.localeCompare(b.name)
    })
    nodes.forEach(n => sortNodes(n.children))
  }
  sortNodes(root)
  return root
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'tsx':
    case 'ts':
    case 'jsx':
    case 'js':
      return <FileCode size={14} className="text-blue-400 flex-shrink-0" />
    case 'json':
      return <FileJson size={14} className="text-yellow-400 flex-shrink-0" />
    case 'css':
      return <FileType size={14} className="text-purple-400 flex-shrink-0" />
    case 'html':
      return <FileText size={14} className="text-orange-400 flex-shrink-0" />
    case 'svg':
    case 'png':
    case 'jpg':
      return <Image size={14} className="text-green-400 flex-shrink-0" />
    default:
      return <File size={14} className="text-slate-400 flex-shrink-0" />
  }
}

function TreeItem({ node, activeFile, onSelectFile, depth = 0 }: {
  node: TreeNode
  activeFile: string | null
  onSelectFile: (path: string) => void
  depth?: number
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const isActive = !node.isDir && node.path === activeFile

  if (node.isDir) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-1 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-slate-700/50 rounded transition-colors"
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
        >
          {expanded ? <ChevronDown size={12} className="flex-shrink-0" /> : <ChevronRight size={12} className="flex-shrink-0" />}
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && node.children.map(child => (
          <TreeItem key={child.path} node={child} activeFile={activeFile} onSelectFile={onSelectFile} depth={depth + 1} />
        ))}
      </div>
    )
  }

  return (
    <button
      onClick={() => onSelectFile(node.path)}
      className={`w-full flex items-center gap-1.5 px-2 py-0.5 text-[11px] rounded transition-colors ${
        isActive
          ? 'bg-indigo-500/20 text-indigo-300'
          : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
      }`}
      style={{ paddingLeft: `${depth * 12 + 16}px` }}
    >
      {getFileIcon(node.name)}
      <span className="truncate">{node.name}</span>
    </button>
  )
}

export default function FileTree({ files, activeFile, onSelectFile }: FileTreeProps) {
  const tree = buildTree(files)

  return (
    <div className="py-1 overflow-y-auto custom-scrollbar">
      {tree.map(node => (
        <TreeItem key={node.path} node={node} activeFile={activeFile} onSelectFile={onSelectFile} />
      ))}
    </div>
  )
}
