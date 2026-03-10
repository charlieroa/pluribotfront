import { describe, expect, it } from 'vitest'
import { parseProjectFilesFromText } from './project-files.js'

describe('parseProjectFilesFromText', () => {
  it('parses a raw JSON array response', () => {
    const result = parseProjectFilesFromText(`[
      { "path": "src/App.jsx", "content": "export default function App(){ return <div>ok</div> }" }
    ]`)

    expect(result.files).toHaveLength(1)
    expect(result.files[0]?.path).toBe('src/App.jsx')
  })

  it('parses a fenced object with files and trailing text', () => {
    const result = parseProjectFilesFromText(`Aqui va tu proyecto
\`\`\`json
{
  "files": [
    { "path": "src/components/Dashboard.jsx", "content": "export function Dashboard(){ return <section>dash</section> }" }
  ]
}
\`\`\`
Notas finales`)

    expect(result.files.some(file => file.path === 'src/components/Dashboard.jsx')).toBe(true)
    expect(result.files.some(file => file.path === 'src/App.jsx')).toBe(true)
  })

  it('throws when the JSON is incomplete', () => {
    expect(() => parseProjectFilesFromText('[{ "path": "src/App.jsx" }')).toThrow('incompleto')
  })
})
