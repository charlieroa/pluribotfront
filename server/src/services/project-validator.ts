/**
 * Pre-publish validation for multi-file dev agent projects.
 * All checks are lightweight (regex + string analysis, no AST parsing).
 * Target: < 100ms for typical projects.
 */

export interface ValidationResult {
  name: string
  status: 'pass' | 'fail' | 'warn'
  message: string
  details?: string[]
}

export interface ValidationReport {
  passed: boolean
  checks: ValidationResult[]
}

interface ProjectFile {
  path: string
  content: string
}

// Known extensions to try when resolving imports
const RESOLVE_EXTENSIONS = ['.jsx', '.tsx', '.js', '.ts']

// Packages known to be problematic with esm.sh / browser bundling
const PROBLEMATIC_PACKAGES = new Set([
  'three', '@react-three/fiber', '@react-three/drei',
  'tensorflow', '@tensorflow/tfjs',
  'puppeteer', 'playwright',
  'sharp', 'canvas',
  'bcrypt', 'argon2',
  'better-sqlite3', 'pg', 'mysql2',
  'fs-extra', 'glob',
  'electron',
  'next', 'nuxt', 'remix',
])

/**
 * Check 1: All local imports resolve to existing files in the project.
 */
export function validateImports(files: ProjectFile[]): ValidationResult {
  const filePaths = new Set(files.map(f => f.path))
  const broken: string[] = []

  // Build a lookup that includes extensionless variants
  const resolves = (target: string): boolean => {
    if (filePaths.has(target)) return true
    for (const ext of RESOLVE_EXTENSIONS) {
      if (filePaths.has(target + ext)) return true
    }
    // Check index files in directory
    for (const ext of RESOLVE_EXTENSIONS) {
      if (filePaths.has(target + '/index' + ext)) return true
    }
    return false
  }

  for (const file of files) {
    // Match: import ... from './...' or import ... from '../...'
    // Also match: export ... from './...'
    const importRe = /(?:import|export)\s+.*?from\s+['"](\.[^'"]+)['"]/g
    let match: RegExpExecArray | null
    while ((match = importRe.exec(file.content)) !== null) {
      const specifier = match[1]
      // Resolve relative to the importing file's directory
      const fileDir = file.path.split('/').slice(0, -1).join('/')
      const parts = (fileDir ? fileDir + '/' + specifier : specifier).split('/')
      // Normalize . and ..
      const resolved: string[] = []
      for (const part of parts) {
        if (part === '.') continue
        if (part === '..') { resolved.pop(); continue }
        resolved.push(part)
      }
      const resolvedPath = resolved.join('/')
      if (!resolves(resolvedPath)) {
        broken.push(`${file.path}: import '${specifier}' -> ${resolvedPath} not found`)
      }
    }
  }

  if (broken.length === 0) {
    return { name: 'imports', status: 'pass', message: 'All local imports resolve correctly' }
  }
  return {
    name: 'imports',
    status: 'fail',
    message: `${broken.length} broken import(s) found`,
    details: broken.slice(0, 20), // cap output
  }
}

/**
 * Check 2: Basic syntax validation using regex heuristics.
 */
export function validateSyntax(files: ProjectFile[]): ValidationResult {
  const issues: string[] = []

  for (const file of files) {
    // Only check source files
    if (!/\.(jsx?|tsx?)$/.test(file.path)) continue
    const content = file.content

    // Check bracket/paren balance
    let parens = 0, brackets = 0, braces = 0
    let inString: string | null = null
    let inTemplate = false
    let escaped = false

    for (let i = 0; i < content.length; i++) {
      const ch = content[i]
      if (escaped) { escaped = false; continue }
      if (ch === '\\') { escaped = true; continue }

      if (inString) {
        if (ch === inString) inString = null
        continue
      }
      if (inTemplate) {
        if (ch === '`') inTemplate = false
        continue
      }

      if (ch === '"' || ch === "'") { inString = ch; continue }
      if (ch === '`') { inTemplate = true; continue }

      // Skip single-line comments
      if (ch === '/' && i + 1 < content.length) {
        if (content[i + 1] === '/') {
          const nl = content.indexOf('\n', i)
          i = nl === -1 ? content.length : nl
          continue
        }
        if (content[i + 1] === '*') {
          const end = content.indexOf('*/', i + 2)
          i = end === -1 ? content.length : end + 1
          continue
        }
      }

      if (ch === '(') parens++
      else if (ch === ')') parens--
      else if (ch === '[') brackets++
      else if (ch === ']') brackets--
      else if (ch === '{') braces++
      else if (ch === '}') braces--
    }

    if (parens !== 0) issues.push(`${file.path}: unbalanced parentheses (${parens > 0 ? parens + ' unclosed' : Math.abs(parens) + ' extra closing'})`)
    if (brackets !== 0) issues.push(`${file.path}: unbalanced brackets (${brackets > 0 ? brackets + ' unclosed' : Math.abs(brackets) + ' extra closing'})`)
    if (braces !== 0) issues.push(`${file.path}: unbalanced braces (${braces > 0 ? braces + ' unclosed' : Math.abs(braces) + ' extra closing'})`)

    // Check for unterminated strings (simple heuristic: odd number of unescaped quotes per line)
    if (inString) {
      issues.push(`${file.path}: possible unterminated string literal`)
    }

    // Check duplicate default exports
    const defaultExports = (content.match(/export\s+default\s+/g) || []).length
    if (defaultExports > 1) {
      issues.push(`${file.path}: ${defaultExports} default exports (only 1 allowed)`)
    }
  }

  if (issues.length === 0) {
    return { name: 'syntax', status: 'pass', message: 'No syntax issues detected' }
  }
  // Bracket imbalance is a warning — regex heuristics can have false positives with JSX
  return {
    name: 'syntax',
    status: 'warn',
    message: `${issues.length} potential syntax issue(s)`,
    details: issues.slice(0, 20),
  }
}

/**
 * Check 3: App entry point exists and is well-formed.
 */
export function validateAppEntry(files: ProjectFile[]): ValidationResult {
  const details: string[] = []
  const appFile = files.find(f => f.path === 'src/App.jsx' || f.path === 'src/App.tsx')
  const mainFile = files.find(f => f.path === 'src/main.jsx' || f.path === 'src/main.tsx')

  if (!appFile) {
    return {
      name: 'app-entry',
      status: 'fail',
      message: 'Missing src/App.jsx or src/App.tsx',
    }
  }

  // Check it has a default export
  const hasDefaultExport = /export\s+default\s+/.test(appFile.content) ||
    /export\s*\{[^}]*default[^}]*\}/.test(appFile.content)
  if (!hasDefaultExport) {
    details.push(`${appFile.path}: no default export found`)
  }

  if (!mainFile) {
    details.push('Missing src/main.jsx or src/main.tsx (template base may provide it)')
  } else {
    // Check main imports App
    const importsApp = /import\s+.*App.*from/.test(mainFile.content)
    if (!importsApp) {
      details.push(`${mainFile.path}: does not appear to import App`)
    }
  }

  if (details.length === 0) {
    return { name: 'app-entry', status: 'pass', message: 'App entry point is valid' }
  }
  return {
    name: 'app-entry',
    status: details.some(d => d.includes('no default export')) ? 'fail' : 'warn',
    message: 'App entry point has issues',
    details,
  }
}

/**
 * Check 4: No empty or stub files.
 */
export function validateFileContent(files: ProjectFile[]): ValidationResult {
  const stubs: string[] = []

  for (const file of files) {
    if (!/\.(jsx?|tsx?)$/.test(file.path)) continue
    const trimmed = file.content.trim()
    if (trimmed.length < 10) {
      stubs.push(`${file.path}: only ${trimmed.length} chars`)
    } else if (/^\/\/\s*(todo|placeholder|stub)/i.test(trimmed) && trimmed.length < 50) {
      stubs.push(`${file.path}: appears to be a placeholder`)
    }
  }

  if (stubs.length === 0) {
    return { name: 'file-content', status: 'pass', message: 'All source files have meaningful content' }
  }
  return {
    name: 'file-content',
    status: 'warn',
    message: `${stubs.length} file(s) appear empty or stubbed`,
    details: stubs,
  }
}

/**
 * Check 5: External dependency check for known problematic packages.
 */
export function validateDependencies(files: ProjectFile[]): ValidationResult {
  const externalImports = new Set<string>()
  const problematic: string[] = []

  for (const file of files) {
    // Match imports that are NOT relative (don't start with . or /)
    const importRe = /(?:import|export)\s+.*?from\s+['"]([^.'"/][^'"]*)['"]/g
    let match: RegExpExecArray | null
    while ((match = importRe.exec(file.content)) !== null) {
      // Extract package name (handle scoped packages like @org/pkg)
      const specifier = match[1]
      const pkg = specifier.startsWith('@')
        ? specifier.split('/').slice(0, 2).join('/')
        : specifier.split('/')[0]
      externalImports.add(pkg)
    }
  }

  for (const pkg of externalImports) {
    if (PROBLEMATIC_PACKAGES.has(pkg)) {
      problematic.push(`${pkg}: may not work in browser/esm.sh environment`)
    }
  }

  if (problematic.length === 0) {
    return {
      name: 'dependencies',
      status: 'pass',
      message: `${externalImports.size} external package(s) detected, all compatible`,
    }
  }
  return {
    name: 'dependencies',
    status: 'warn',
    message: `${problematic.length} potentially problematic package(s)`,
    details: problematic,
  }
}

/**
 * Main runner: executes all validation checks and returns a report.
 */
export async function runPrePublishChecks(files: ProjectFile[]): Promise<ValidationReport> {
  const checks = [
    validateImports(files),
    validateSyntax(files),
    validateAppEntry(files),
    validateFileContent(files),
    validateDependencies(files),
  ]

  const passed = !checks.some(c => c.status === 'fail')

  return { passed, checks }
}
