import { v4 as uuid } from 'uuid'
import { prisma } from '../db/client.js'
import { computeFileHash } from './project-storage.js'

/**
 * Upsert ProjectFile records for each file in a deliverable.
 * Creates new records or updates existing ones (by deliverableId + filePath).
 */
export async function trackFiles(
  conversationId: string,
  deliverableId: string,
  files: { path: string; content: string }[]
): Promise<void> {
  for (const file of files) {
    const hash = computeFileHash(file.content)
    const size = Buffer.byteLength(file.content, 'utf-8')

    // Upsert: update if same deliverableId+filePath, create otherwise
    // Prisma SQLite doesn't support upsert with composite unique well,
    // so we do find + create/update
    const existing = await prisma.projectFile.findFirst({
      where: { deliverableId, filePath: file.path },
    })

    if (existing) {
      await prisma.projectFile.update({
        where: { id: existing.id },
        data: { hash, size, lastModified: new Date() },
      })
    } else {
      await prisma.projectFile.create({
        data: {
          id: uuid(),
          conversationId,
          deliverableId,
          filePath: file.path,
          hash,
          size,
        },
      })
    }
  }

  console.log(`[ProjectFileTracker] Tracked ${files.length} files for deliverable ${deliverableId}`)
}

/**
 * Get the current file manifest (listing) for a conversation.
 * Returns the latest version of each file path.
 */
export async function getFileManifest(
  conversationId: string
): Promise<{ path: string; hash: string; size: number }[]> {
  const records = await prisma.projectFile.findMany({
    where: { conversationId },
    orderBy: { lastModified: 'desc' },
  })

  // Deduplicate by filePath, keeping the most recent
  const seen = new Set<string>()
  const manifest: { path: string; hash: string; size: number }[] = []
  for (const record of records) {
    if (!seen.has(record.filePath)) {
      seen.add(record.filePath)
      manifest.push({
        path: record.filePath,
        hash: record.hash,
        size: record.size,
      })
    }
  }

  return manifest
}

/**
 * Compare new files against the current manifest to determine changes.
 */
export async function getChangedFiles(
  conversationId: string,
  newFiles: { path: string; content: string }[]
): Promise<{
  added: string[]
  modified: string[]
  unchanged: string[]
  deleted: string[]
}> {
  const manifest = await getFileManifest(conversationId)
  const manifestMap = new Map(manifest.map(f => [f.path, f.hash]))
  const newFilePaths = new Set(newFiles.map(f => f.path))

  const added: string[] = []
  const modified: string[] = []
  const unchanged: string[] = []
  const deleted: string[] = []

  for (const file of newFiles) {
    const existingHash = manifestMap.get(file.path)
    if (!existingHash) {
      added.push(file.path)
    } else {
      const newHash = computeFileHash(file.content)
      if (newHash !== existingHash) {
        modified.push(file.path)
      } else {
        unchanged.push(file.path)
      }
    }
  }

  for (const [filePath] of manifestMap) {
    if (!newFilePaths.has(filePath)) {
      deleted.push(filePath)
    }
  }

  return { added, modified, unchanged, deleted }
}
