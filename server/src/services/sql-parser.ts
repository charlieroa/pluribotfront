// Parse SQL CREATE TABLE statements from HTML <script type="text/sql"> blocks

export interface ColumnDef {
  name: string
  type: 'string' | 'number' | 'boolean' | 'date'
  required: boolean
  defaultValue?: string
}

export interface TableDef {
  tableName: string
  columns: ColumnDef[]
}

const TABLE_NAME_RE = /^[a-z_][a-z0-9_]{0,63}$/

// Map SQL types to simple types
function mapSqlType(sqlType: string): ColumnDef['type'] {
  const t = sqlType.toUpperCase()
  if (t.includes('INT') || t.includes('DECIMAL') || t.includes('FLOAT') || t.includes('DOUBLE') || t.includes('NUMERIC') || t.includes('REAL')) return 'number'
  if (t.includes('BOOL')) return 'boolean'
  if (t.includes('TIMESTAMP') || t.includes('DATE') || t.includes('TIME')) return 'date'
  return 'string'
}

// Parse a single CREATE TABLE statement
function parseCreateTable(sql: string): TableDef | null {
  const match = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?\s*\(([\s\S]*)\)/i)
  if (!match) return null

  const tableName = match[1].toLowerCase()
  if (!TABLE_NAME_RE.test(tableName)) return null

  const body = match[2]
  const columns: ColumnDef[] = []

  // Split by comma but respect parentheses (for constraints like CHECK(...))
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of body) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) parts.push(current.trim())

  for (const part of parts) {
    const trimmed = part.trim()
    // Skip constraints (PRIMARY KEY, UNIQUE, FOREIGN KEY, CHECK, CONSTRAINT)
    if (/^(PRIMARY|UNIQUE|FOREIGN|CHECK|CONSTRAINT)\s/i.test(trimmed)) continue

    // Parse column: name TYPE [NOT NULL] [DEFAULT value]
    const colMatch = trimmed.match(/^["`]?(\w+)["`]?\s+(\w+(?:\([^)]*\))?)/i)
    if (!colMatch) continue

    const colName = colMatch[1].toLowerCase()
    const sqlType = colMatch[2]

    // Skip auto-generated columns
    if (colName === 'id' && /UUID|SERIAL|INTEGER.*PRIMARY/i.test(trimmed)) continue

    const required = /NOT\s+NULL/i.test(trimmed)
    const defaultMatch = trimmed.match(/DEFAULT\s+(.+?)(?:\s+(?:NOT|NULL|PRIMARY|UNIQUE|CHECK|REFERENCES|,)|$)/i)
    const defaultValue = defaultMatch ? defaultMatch[1].replace(/^['"]|['"]$/g, '') : undefined

    columns.push({
      name: colName,
      type: mapSqlType(sqlType),
      required,
      defaultValue,
    })
  }

  return columns.length > 0 ? { tableName, columns } : null
}

// Extract all SQL blocks from HTML and parse CREATE TABLE statements
export function extractAndParseSql(html: string): TableDef[] {
  const tables: TableDef[] = []
  const sqlBlockRe = /<script\s+type=["']text\/sql["'][^>]*>([\s\S]*?)<\/script>/gi
  let match

  while ((match = sqlBlockRe.exec(html)) !== null) {
    const sqlContent = match[1]
    // Split by semicolons to handle multiple statements
    const statements = sqlContent.split(';').filter(s => s.trim())
    for (const stmt of statements) {
      const table = parseCreateTable(stmt.trim())
      if (table) tables.push(table)
    }
  }

  return tables
}

// Serialize table definitions for injection into agent context
export function schemaToContext(tables: TableDef[]): string {
  if (tables.length === 0) return ''
  const lines = tables.map(t => {
    const cols = t.columns.map(c => `  ${c.name}: ${c.type}${c.required ? ' (required)' : ''}${c.defaultValue ? ` = ${c.defaultValue}` : ''}`).join('\n')
    return `${t.tableName}:\n${cols}`
  })
  return lines.join('\n\n')
}
