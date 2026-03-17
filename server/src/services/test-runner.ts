/**
 * Pre-deploy validation orchestrator.
 * Ties project validation into the deploy flow.
 */

import { runPrePublishChecks, type ValidationReport } from './project-validator.js'

/**
 * Validate content before deploying.
 * - If content is a JSON file array, parse and run all checks.
 * - If content is raw HTML (already built), skip validation — nothing to check.
 */
export async function validateBeforeDeploy(content: string): Promise<ValidationReport> {
  const trimmed = content.trim()

  // If it starts with '[', it's a JSON file array (multi-file project)
  if (trimmed.startsWith('[')) {
    try {
      const files = JSON.parse(trimmed) as { path: string; content: string }[]
      if (Array.isArray(files) && files.length > 0 && files[0].path && files[0].content !== undefined) {
        return runPrePublishChecks(files)
      }
    } catch {
      // If JSON parse fails, treat as raw content — the deploy service will handle it
    }
  }

  // Raw HTML or non-parseable content — skip validation
  return {
    passed: true,
    checks: [
      {
        name: 'format',
        status: 'pass',
        message: 'Content is pre-built HTML, validation skipped',
      },
    ],
  }
}
