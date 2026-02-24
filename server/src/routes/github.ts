import { Router } from 'express'
import { Octokit } from '@octokit/rest'
import { z } from 'zod'

const router = Router()

const pushSchema = z.object({
  repoUrl: z.string().min(1),
  token: z.string().min(1),
  files: z.array(z.object({
    filePath: z.string(),
    content: z.string(),
  })),
  commitMessage: z.string().min(1),
  branch: z.string().optional().default('main'),
})

/**
 * POST /api/github/push
 * Push project files to a GitHub repository
 */
router.post('/push', async (req, res) => {
  try {
    const parsed = pushSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
      return
    }

    const { repoUrl, token, files, commitMessage, branch } = parsed.data

    // Parse owner/repo from URL (supports github.com/owner/repo and owner/repo)
    const match = repoUrl.match(/(?:github\.com\/)?([^/]+)\/([^/.\s]+)/)
    if (!match) {
      res.status(400).json({ error: 'Invalid repository URL. Use format: owner/repo or https://github.com/owner/repo' })
      return
    }
    const owner = match[1]
    const repo = match[2]

    const octokit = new Octokit({ auth: token })

    // Get the default branch's latest commit SHA
    let baseSha: string
    try {
      const { data: refData } = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` })
      baseSha = refData.object.sha
    } catch {
      // Branch doesn't exist — try to create from default branch
      const { data: repoData } = await octokit.repos.get({ owner, repo })
      const defaultBranch = repoData.default_branch
      const { data: defaultRef } = await octokit.git.getRef({ owner, repo, ref: `heads/${defaultBranch}` })
      baseSha = defaultRef.object.sha

      // Create the new branch
      await octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branch}`,
        sha: baseSha,
      })
    }

    // Get the base tree
    const { data: baseCommit } = await octokit.git.getCommit({ owner, repo, commit_sha: baseSha })
    const baseTreeSha = baseCommit.tree.sha

    // Create blobs for each file
    const treeItems = await Promise.all(
      files.map(async (file) => {
        const { data: blob } = await octokit.git.createBlob({
          owner,
          repo,
          content: Buffer.from(file.content).toString('base64'),
          encoding: 'base64',
        })
        return {
          path: file.filePath,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blob.sha,
        }
      })
    )

    // Create new tree
    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: baseTreeSha,
      tree: treeItems,
    })

    // Create commit
    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo,
      message: commitMessage,
      tree: newTree.sha,
      parents: [baseSha],
    })

    // Update branch reference
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha,
    })

    res.json({
      success: true,
      commitSha: newCommit.sha,
      commitUrl: `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`,
    })
  } catch (err: unknown) {
    console.error('[GitHub Push] Error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

export default router
