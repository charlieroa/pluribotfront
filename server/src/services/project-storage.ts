import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const STORAGE_BASE = process.env.PROJECT_STORAGE_PATH || path.resolve(process.cwd(), 'storage/projects')

/**
 * Get the directory path for a conversation's project files.
 */
export function getProjectDir(conversationId: string): string {
  return path.join(STORAGE_BASE, conversationId)
}

/**
 * Compute SHA-256 hash of file content.
 */
export function computeFileHash(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex')
}

/**
 * Write project files to disk for a conversation.
 * Creates directories as needed.
 */
export async function writeProjectFiles(
  conversationId: string,
  files: { path: string; content: string }[]
): Promise<void> {
  const projectDir = getProjectDir(conversationId)

  for (const file of files) {
    const filePath = path.join(projectDir, file.path)
    const fileDir = path.dirname(filePath)
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true })
    }
    fs.writeFileSync(filePath, file.content, 'utf-8')
  }

  console.log(`[ProjectStorage] Wrote ${files.length} files to ${projectDir}`)
}

/**
 * Read a single project file from disk.
 */
export async function readProjectFile(
  conversationId: string,
  filePath: string
): Promise<string> {
  const fullPath = path.join(getProjectDir(conversationId), filePath)
  return fs.readFileSync(fullPath, 'utf-8')
}

/**
 * Read all project files from disk for a conversation.
 * Returns empty array if project directory doesn't exist.
 */
export async function readAllProjectFiles(
  conversationId: string
): Promise<{ path: string; content: string }[]> {
  const projectDir = getProjectDir(conversationId)
  if (!fs.existsSync(projectDir)) {
    return []
  }

  const files: { path: string; content: string }[] = []
  walkDir(projectDir, projectDir, files)
  return files
}

/**
 * Recursively walk a directory and collect files.
 * Skips the .history directory used for archives.
 */
function walkDir(
  baseDir: string,
  currentDir: string,
  files: { path: string; content: string }[]
): void {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name)
    if (entry.isDirectory()) {
      // Skip history/archive directory
      if (entry.name === '.history') continue
      walkDir(baseDir, fullPath, files)
    } else {
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/')
      try {
        const content = fs.readFileSync(fullPath, 'utf-8')
        files.push({ path: relativePath, content })
      } catch {
        // Skip unreadable files
      }
    }
  }
}

/**
 * Delete a single project file from disk.
 */
export async function deleteProjectFile(
  conversationId: string,
  filePath: string
): Promise<void> {
  const fullPath = path.join(getProjectDir(conversationId), filePath)
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath)
  }
}

/**
 * Archive a file version under .history/{commitId}/{filePath}.
 */
export async function archiveFile(
  conversationId: string,
  commitId: string,
  filePath: string,
  content: string
): Promise<void> {
  const archivePath = path.join(getProjectDir(conversationId), '.history', commitId, filePath)
  const archiveDir = path.dirname(archivePath)
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true })
  }
  fs.writeFileSync(archivePath, content, 'utf-8')
}

/**
 * Read an archived file version.
 */
export async function readArchivedFile(
  conversationId: string,
  commitId: string,
  filePath: string
): Promise<string> {
  const archivePath = path.join(getProjectDir(conversationId), '.history', commitId, filePath)
  return fs.readFileSync(archivePath, 'utf-8')
}
