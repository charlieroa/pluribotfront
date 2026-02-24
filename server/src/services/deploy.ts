import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DEPLOY_DIR = path.resolve(__dirname, '../../deploys')

/**
 * Deploy a project's HTML to a static file, returning a public URL.
 */
export async function deployProject(deployId: string, htmlContent: string): Promise<string> {
  // Ensure deploy directory exists
  if (!fs.existsSync(DEPLOY_DIR)) {
    fs.mkdirSync(DEPLOY_DIR, { recursive: true })
  }

  const projectDir = path.join(DEPLOY_DIR, deployId)
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true })
  }

  // Write the HTML file
  fs.writeFileSync(path.join(projectDir, 'index.html'), htmlContent, 'utf-8')

  const baseUrl = process.env.DEPLOY_BASE_URL || `http://localhost:${process.env.PORT ?? '3002'}`
  return `${baseUrl}/deploys/${deployId}/`
}

/**
 * Check if a deploy exists.
 */
export function getDeployStatus(deployId: string): { exists: boolean; url?: string } {
  const indexPath = path.join(DEPLOY_DIR, deployId, 'index.html')
  if (fs.existsSync(indexPath)) {
    const baseUrl = process.env.DEPLOY_BASE_URL || `http://localhost:${process.env.PORT ?? '3002'}`
    return { exists: true, url: `${baseUrl}/deploys/${deployId}/` }
  }
  return { exists: false }
}

/**
 * Remove a deployed project.
 */
export function removeDeploy(deployId: string): void {
  const projectDir = path.join(DEPLOY_DIR, deployId)
  if (fs.existsSync(projectDir)) {
    fs.rmSync(projectDir, { recursive: true, force: true })
  }
}

/** Get the deploy directory path for Express static serving */
export function getDeployDir(): string {
  return DEPLOY_DIR
}
