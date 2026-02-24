import type { ProjectArtifact } from '../../../shared/types.js'

/**
 * Merge a partial update artifact with a base artifact.
 * - Files in update replace matching files in base
 * - New files in update are added
 * - Files in base not mentioned in update are kept unchanged
 */
export function mergeArtifacts(
  base: ProjectArtifact,
  update: ProjectArtifact
): ProjectArtifact {
  const mergedFiles = [...base.files]

  for (const updateFile of update.files) {
    const existingIdx = mergedFiles.findIndex(f => f.filePath === updateFile.filePath)
    if (existingIdx !== -1) {
      // Replace existing file
      mergedFiles[existingIdx] = updateFile
    } else {
      // Add new file
      mergedFiles.push(updateFile)
    }
  }

  // Merge shell commands
  const shellCommands = [
    ...(base.shellCommands ?? []),
    ...(update.shellCommands ?? []),
  ]

  return {
    id: update.id || base.id,
    title: update.title || base.title,
    files: mergedFiles,
    shellCommands: shellCommands.length > 0 ? shellCommands : undefined,
  }
}

/**
 * Format a ProjectArtifact as context string for the LLM refinement prompt.
 * Shows file tree + truncated file contents for context efficiency.
 */
export function formatArtifactAsContext(artifact: ProjectArtifact): string {
  const parts: string[] = []

  parts.push(`=== PROYECTO ACTUAL: ${artifact.title} (${artifact.files.length} archivos) ===`)
  parts.push('')
  parts.push('Archivos:')
  for (const file of artifact.files) {
    parts.push(`  - ${file.filePath} (${file.language})`)
  }
  parts.push('')

  // Include full file contents for context
  for (const file of artifact.files) {
    parts.push(`--- ${file.filePath} ---`)
    // Truncate very large files to save tokens
    if (file.content.length > 3000) {
      parts.push(file.content.substring(0, 3000))
      parts.push(`... (${file.content.length - 3000} caracteres mas)`)
    } else {
      parts.push(file.content)
    }
    parts.push(`--- fin ${file.filePath} ---`)
    parts.push('')
  }

  return parts.join('\n')
}
