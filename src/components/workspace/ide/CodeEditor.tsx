import { useCallback } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { json } from '@codemirror/lang-json'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'
import { keymap } from '@codemirror/view'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  onSave: () => void
  filePath: string
}

function getLanguageExtension(filePath: string) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx'))
    return javascript({ jsx: true, typescript: filePath.endsWith('.tsx') })
  if (filePath.endsWith('.ts'))
    return javascript({ typescript: true })
  if (filePath.endsWith('.js'))
    return javascript()
  if (filePath.endsWith('.css'))
    return css()
  if (filePath.endsWith('.html'))
    return html()
  if (filePath.endsWith('.json'))
    return json()
  return javascript()
}

export default function CodeEditor({ value, onChange, onSave, filePath }: CodeEditorProps) {
  const saveKeymap = useCallback(
    () =>
      keymap.of([
        {
          key: 'Mod-s',
          run: () => {
            onSave()
            return true
          },
        },
      ]),
    [onSave],
  )

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme={vscodeDark}
      extensions={[getLanguageExtension(filePath), saveKeymap()]}
      height="100%"
      style={{ height: '100%', fontSize: '13px' }}
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: true,
        autocompletion: true,
        bracketMatching: true,
        closeBrackets: true,
        indentOnInput: true,
      }}
    />
  )
}
