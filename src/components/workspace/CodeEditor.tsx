import { useCallback } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { markdown } from '@codemirror/lang-markdown'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'

interface CodeEditorProps {
  code: string
  language: string
  fileName: string
  onChange?: (code: string) => void
  readOnly?: boolean
}

function getLanguageExtension(lang: string) {
  switch (lang) {
    case 'typescript':
    case 'tsx':
      return javascript({ jsx: true, typescript: true })
    case 'javascript':
    case 'jsx':
      return javascript({ jsx: true })
    case 'json':
      return json()
    case 'css':
      return css()
    case 'html':
    case 'xml':
      return html()
    case 'markdown':
    case 'md':
      return markdown()
    default:
      return javascript({ jsx: true, typescript: true })
  }
}

export default function CodeEditor({ code, language, fileName, onChange, readOnly = false }: CodeEditorProps) {
  const handleChange = useCallback((value: string) => {
    onChange?.(value)
  }, [onChange])

  const extensions = [getLanguageExtension(language)]

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#1e1e1e]">
      {/* File name bar */}
      <div className="sticky top-0 z-10 px-4 py-1.5 bg-[#252526] border-b border-[#3c3c3c] text-[11px] text-[#cccccc] font-mono flex-shrink-0">
        {fileName}
      </div>
      <div className="flex-1 overflow-auto">
        <CodeMirror
          value={code}
          theme={vscodeDark}
          extensions={extensions}
          onChange={handleChange}
          readOnly={readOnly}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: true,
            bracketMatching: true,
            autocompletion: true,
            indentOnInput: true,
          }}
          style={{ fontSize: '12px', height: '100%' }}
        />
      </div>
    </div>
  )
}
