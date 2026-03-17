export interface ProjectFile {
  path: string
  content: string
}

export interface ValidatedProject {
  files: ProjectFile[]
  warnings: string[]
}

interface ProjectPayloadShape {
  files?: unknown
}

const PATH_RE = /^(src|public)\/[a-zA-Z0-9._/-]+$|^(package\.json|vite\.config\.(js|ts)|tailwind\.config\.js|postcss\.config\.js|index\.html|README\.md)$/
const LOCAL_CSS_IMPORT_RE = /import\s+['"](\.\/|\.\.\/)[^'"]+\.css['"]/g

function fallbackAppFile(): ProjectFile {
  return {
    path: 'src/App.jsx',
    content: `export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="max-w-lg text-center">
        <h1 className="text-3xl font-semibold">Proyecto recuperado</h1>
        <p className="mt-3 text-sm text-slate-300">El agente no genero un App valido. Se creo este fallback para evitar una pantalla en blanco.</p>
      </div>
    </div>
  )
}
`,
  }
}

export function validateProjectFiles(input: unknown): ValidatedProject {
  if (!Array.isArray(input)) {
    throw new Error('El proyecto debe ser un array de archivos')
  }

  const warnings: string[] = []
  const deduped = new Map<string, string>()

  for (const rawFile of input) {
    if (!rawFile || typeof rawFile !== 'object') continue
    const file = rawFile as Record<string, unknown>
    const path = typeof file.path === 'string' ? file.path.trim().replace(/\\/g, '/') : ''
    const content = typeof file.content === 'string' ? file.content : ''

    if (!path || !content) continue
    if (path.includes('..')) throw new Error(`Ruta invalida: ${path}`)
    if (!PATH_RE.test(path)) throw new Error(`Archivo no permitido: ${path}`)
    if (content.length > 250_000) throw new Error(`Archivo demasiado grande: ${path}`)
    deduped.set(path, content)
  }

  const files = [...deduped.entries()].map(([path, content]) => ({ path, content }))
  if (files.length === 0) {
    throw new Error('El proyecto no contiene archivos validos')
  }

  const existingPaths = new Set(files.map(file => file.path))
  const missingCssFiles = new Set<string>()

  for (const file of files) {
    if (!/^src\/.*\.(js|jsx|ts|tsx)$/.test(file.path)) continue
    for (const match of file.content.matchAll(LOCAL_CSS_IMPORT_RE)) {
      const rawImport = match[0].match(/['"]([^'"]+\.css)['"]/)?.[1]
      if (!rawImport) continue
      const resolvedPath = resolveRelativeProjectPath(file.path, rawImport)
      if (resolvedPath && !existingPaths.has(resolvedPath)) {
        missingCssFiles.add(resolvedPath)
      }
    }
  }

  for (const cssPath of missingCssFiles) {
    warnings.push(`Se agrego ${cssPath} vacio porque estaba importado pero no fue generado`)
    files.push({
      path: cssPath,
      content: '/* Archivo CSS agregado automaticamente para evitar ENOENT en preview/refine. */\n',
    })
    existingPaths.add(cssPath)
  }

  const hasApp = files.some(file => file.path === 'src/App.jsx' || file.path === 'src/App.tsx')
  if (!hasApp) {
    warnings.push('Se agrego src/App.jsx fallback porque el proyecto no lo incluia')
    files.unshift(fallbackAppFile())
  }

  const hasMain = files.some(file => file.path === 'src/main.jsx' || file.path === 'src/main.tsx')
  if (!hasMain) {
    warnings.push('El proyecto no incluye src/main.*; se espera que el template base lo provea')
  }

  return { files, warnings }
}

function resolveRelativeProjectPath(fromPath: string, importPath: string): string | null {
  const fromParts = fromPath.split('/').slice(0, -1)
  const importParts = importPath.split('/')
  const resolved: string[] = [...fromParts]

  for (const part of importParts) {
    if (!part || part === '.') continue
    if (part === '..') {
      if (resolved.length <= 1) return null
      resolved.pop()
      continue
    }
    resolved.push(part)
  }

  const normalized = resolved.join('/')
  return normalized.startsWith('src/') ? normalized : null
}

function unwrapProjectPayload(input: unknown): unknown {
  if (Array.isArray(input)) return input
  if (input && typeof input === 'object' && Array.isArray((input as ProjectPayloadShape).files)) {
    return (input as ProjectPayloadShape).files
  }
  return input
}

function extractJsonCandidate(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('Respuesta vacia del agente')

  const fenceMatch = trimmed.match(/```(?:json|javascript)?\s*([\s\S]*?)```/i)
  const unfenced = fenceMatch ? fenceMatch[1].trim() : trimmed
  const starts = [unfenced.indexOf('['), unfenced.indexOf('{')].filter(i => i >= 0)
  if (starts.length === 0) {
    throw new Error('No se encontro JSON del proyecto en la respuesta')
  }

  const start = Math.min(...starts)
  const opening = unfenced[start]
  const closing = opening === '[' ? ']' : '}'
  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < unfenced.length; i++) {
    const char = unfenced[i]

    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (char === opening) depth += 1
    if (char === closing) {
      depth -= 1
      if (depth === 0) {
        return unfenced.slice(start, i + 1)
      }
    }
  }

  throw new Error('El JSON del proyecto esta incompleto')
}

export function parseProjectFilesFromText(raw: string): ValidatedProject {
  const jsonCandidate = extractJsonCandidate(raw)
  const parsed = JSON.parse(jsonCandidate)
  return validateProjectFiles(unwrapProjectPayload(parsed))
}
