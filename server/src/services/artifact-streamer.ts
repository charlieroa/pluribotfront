import { detectLanguage } from './artifact-parser.js'

export interface FileUpdateEvent {
  filePath: string
  content: string
  language: string
}

export interface StreamEvent {
  type: 'artifact_start' | 'file_update'
  filePath?: string
  content?: string
  language?: string
  partial?: boolean // true = partial content, false = file complete
}

/**
 * ArtifactStreamer — parses logicArtifact XML tags from streaming tokens
 * in real-time, emitting file_update events as each file completes.
 * Also emits artifact_start when the artifact block is first detected,
 * and partial file_update events while files are being written.
 */
export class ArtifactStreamer {
  private buffer = ''
  private currentFile: { path: string; chunks: string[] } | null = null
  private insideArtifact = false
  private artifactStarted = false
  private completedFiles: FileUpdateEvent[] = []
  private lastPartialLength = 0
  private static readonly PARTIAL_THRESHOLD = 500 // emit partial every ~500 chars

  /**
   * Feed a new token into the streamer.
   * Returns StreamEvent[] — may include artifact_start, partial file_update, or complete file_update.
   */
  onToken(token: string): StreamEvent[] {
    this.buffer += token
    const events: StreamEvent[] = []

    // Detect artifact start
    if (!this.insideArtifact) {
      if (this.buffer.includes('<logicArtifact')) {
        const closeTag = this.buffer.indexOf('>', this.buffer.indexOf('<logicArtifact'))
        if (closeTag !== -1) {
          this.insideArtifact = true
          // Emit artifact_start the first time
          if (!this.artifactStarted) {
            this.artifactStarted = true
            events.push({ type: 'artifact_start' })
          }
          // Process buffer after the opening tag
          this.buffer = this.buffer.substring(closeTag + 1)
        }
      }
      if (!this.insideArtifact) return events
    }

    // Process within artifact
    this.processBuffer(events)
    return events
  }

  private processBuffer(events: StreamEvent[]): void {
    // If we're inside a file action, look for its closing tag
    if (this.currentFile) {
      const closeTag = '</logicAction>'
      const closeIdx = this.buffer.indexOf(closeTag)
      if (closeIdx !== -1) {
        // File completed
        this.currentFile.chunks.push(this.buffer.substring(0, closeIdx))
        const content = this.currentFile.chunks.join('').replace(/^\n/, '').replace(/\n$/, '')
        const event: StreamEvent = {
          type: 'file_update',
          filePath: this.currentFile.path,
          content,
          language: detectLanguage(this.currentFile.path),
          partial: false,
        }
        events.push(event)
        this.completedFiles.push({
          filePath: this.currentFile.path,
          content,
          language: detectLanguage(this.currentFile.path),
        })
        this.currentFile = null
        this.lastPartialLength = 0
        this.buffer = this.buffer.substring(closeIdx + closeTag.length)
        // Continue processing remaining buffer
        this.processBuffer(events)
        return
      }
      // File still in progress — emit partial if enough content accumulated
      const currentContent = this.currentFile.chunks.join('') + this.buffer
      if (currentContent.length - this.lastPartialLength >= ArtifactStreamer.PARTIAL_THRESHOLD) {
        this.lastPartialLength = currentContent.length
        events.push({
          type: 'file_update',
          filePath: this.currentFile.path,
          content: currentContent.replace(/^\n/, ''),
          language: detectLanguage(this.currentFile.path),
          partial: true,
        })
      }
      return
    }

    // Look for new file action opening
    const fileActionRegex = /<logicAction\s+type="file"\s+filePath="([^"]*)">/
    const match = this.buffer.match(fileActionRegex)
    if (match && match.index !== undefined) {
      const filePath = match[1]
      const afterTag = match.index + match[0].length
      this.currentFile = { path: filePath, chunks: [] }
      this.lastPartialLength = 0
      this.buffer = this.buffer.substring(afterTag)
      // Continue processing to check if close tag is already in buffer
      this.processBuffer(events)
      return
    }

    // Also handle reversed attribute order: filePath before type
    const altRegex = /<logicAction\s+filePath="([^"]*)"\s+type="file">/
    const altMatch = this.buffer.match(altRegex)
    if (altMatch && altMatch.index !== undefined) {
      const filePath = altMatch[1]
      const afterTag = altMatch.index + altMatch[0].length
      this.currentFile = { path: filePath, chunks: [] }
      this.lastPartialLength = 0
      this.buffer = this.buffer.substring(afterTag)
      this.processBuffer(events)
      return
    }

    // Handle shell action (self-closing)
    const shellRegex = /<logicAction\s+type="shell"\s+command="[^"]*"\s*\/>/
    const shellMatch = this.buffer.match(shellRegex)
    if (shellMatch && shellMatch.index !== undefined) {
      this.buffer = this.buffer.substring(shellMatch.index + shellMatch[0].length)
      this.processBuffer(events)
      return
    }

    // Detect end of artifact
    if (this.buffer.includes('</logicArtifact>')) {
      this.insideArtifact = false
      this.buffer = ''
    }

    // Keep buffer trimmed to avoid unbounded growth (keep last 200 chars for tag detection)
    if (!this.currentFile && this.buffer.length > 500) {
      this.buffer = this.buffer.substring(this.buffer.length - 200)
    }
  }

  /** Get all files completed so far */
  getCompletedFiles(): FileUpdateEvent[] {
    return [...this.completedFiles]
  }

  /** Check if currently inside an artifact */
  isStreaming(): boolean {
    return this.insideArtifact
  }

  /** Reset the streamer state */
  reset(): void {
    this.buffer = ''
    this.currentFile = null
    this.insideArtifact = false
    this.artifactStarted = false
    this.completedFiles = []
    this.lastPartialLength = 0
  }
}
