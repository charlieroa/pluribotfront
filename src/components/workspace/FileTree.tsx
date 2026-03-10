import { useMemo, useState } from 'react'
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen, Trash2, Pencil } from 'lucide-react'
import type { ProjectFile } from './WebContainerPreview'

interface FileTreeProps {
  files: ProjectFile[]
  selectedFile?: string
  onSelectFile: (path: string) => void
  filter?: string
  onDeleteFile?: (path: string) => void
  onRenameFile?: (fromPath: string, toPath: string) => void
}

interface TreeNode {
  name: string
  path: string
  isDir: boolean
  children: TreeNode[]
}

function buildTree(files: ProjectFile[]): TreeNode[] {
  const root: TreeNode[] = []

  for (const file of files) {
    const parts = file.path.split('/')
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i]
      const isLast = i === parts.length - 1
      const path = parts.slice(0, i + 1).join('/')

      let node = current.find(n => n.name === name)
      if (!node) {
        node = { name, path, isDir: !isLast, children: [] }
        current.push(node)
      }
      current = node.children
    }
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1
      if (!a.isDir && b.isDir) return 1
      return a.name.localeCompare(b.name)
    })
    for (const node of nodes) {
      if (node.children.length > 0) sortNodes(node.children)
    }
  }
  sortNodes(root)

  return root
}

function matchesFilter(node: TreeNode, filter: string): boolean {
  if (!filter) return true
  const normalized = filter.toLowerCase()
  if (node.path.toLowerCase().includes(normalized)) return true
  return node.children.some(child => matchesFilter(child, filter))
}

function TreeItem({
  node,
  depth,
  selectedFile,
  onSelectFile,
  onDeleteFile,
  onRenameFile,
  filter,
}: {
  node: TreeNode
  depth: number
  selectedFile?: string
  onSelectFile: (path: string) => void
  onDeleteFile?: (path: string) => void
  onRenameFile?: (fromPath: string, toPath: string) => void
  filter: string
}) {
  const [expanded, setExpanded] = useState(depth < 2 || !!filter)
  const isSelected = selectedFile === node.path

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase()
    const colors: Record<string, string> = {
      tsx: 'text-blue-400',
      jsx: 'text-blue-400',
      ts: 'text-blue-400',
      js: 'text-yellow-400',
      css: 'text-purple-400',
      json: 'text-yellow-600',
      html: 'text-orange-400',
      md: 'text-white/40',
    }
    return colors[ext || ''] || 'text-white/30'
  }

  if (!matchesFilter(node, filter)) return null

  if (node.isDir) {
    return (
      <div>
        <button
          onClick={() => setExpanded(prev => !prev)}
          className="flex w-full items-center gap-1 rounded px-2 py-0.5 text-xs text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {expanded ? <FolderOpen size={13} className="text-[#a78bfa]" /> : <Folder size={13} className="text-[#a78bfa]" />}
          <span className="ml-1 truncate">{node.name}</span>
        </button>
        {expanded && node.children.map(child => (
          <TreeItem
            key={child.path}
            node={child}
            depth={depth + 1}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
            onDeleteFile={onDeleteFile}
            filter={filter}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={`group flex items-center gap-1 rounded px-2 py-0.5 text-xs transition-colors ${
        isSelected
          ? 'bg-[#a78bfa]/10 text-white'
          : 'text-white/50 hover:bg-white/[0.04] hover:text-white/80'
      }`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      <button onClick={() => onSelectFile(node.path)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
        <FileText size={13} className={getFileIcon(node.name)} />
        <span className="truncate">{node.name}</span>
      </button>
      {onDeleteFile && (
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onRenameFile && (
            <button
              onClick={event => {
                event.stopPropagation()
                const nextPath = window.prompt('Nuevo nombre o ruta del archivo', node.path)?.trim()
                if (nextPath && nextPath !== node.path) {
                  onRenameFile(node.path, nextPath)
                }
              }}
              className="hover:text-blue-400"
              title="Renombrar archivo"
            >
              <Pencil size={11} />
            </button>
          )}
          <button
            onClick={event => {
              event.stopPropagation()
              onDeleteFile(node.path)
            }}
            className="hover:text-red-400"
            title="Eliminar archivo"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </div>
  )
}

export default function FileTree({ files, selectedFile, onSelectFile, filter = '', onDeleteFile, onRenameFile }: FileTreeProps) {
  const tree = useMemo(() => buildTree(files), [files])

  return (
    <div className="py-2">
      {tree.map(node => (
        <TreeItem
          key={node.path}
          node={node}
          depth={0}
          selectedFile={selectedFile}
          onSelectFile={onSelectFile}
          onDeleteFile={onDeleteFile}
          onRenameFile={onRenameFile}
          filter={filter}
        />
      ))}
    </div>
  )
}
