import { detectLanguage } from './artifact-parser.js';
/**
 * ArtifactStreamer — parses logicArtifact XML tags from streaming tokens
 * in real-time, emitting file_update events as each file completes.
 */
export class ArtifactStreamer {
    buffer = '';
    currentFile = null;
    insideArtifact = false;
    completedFiles = [];
    /**
     * Feed a new token into the streamer.
     * Returns any file_update events that completed with this token.
     */
    onToken(token) {
        this.buffer += token;
        const events = [];
        // Detect artifact start
        if (!this.insideArtifact) {
            if (this.buffer.includes('<logicArtifact')) {
                const closeTag = this.buffer.indexOf('>', this.buffer.indexOf('<logicArtifact'));
                if (closeTag !== -1) {
                    this.insideArtifact = true;
                    // Process buffer after the opening tag
                    this.buffer = this.buffer.substring(closeTag + 1);
                }
            }
            if (!this.insideArtifact)
                return events;
        }
        // Process within artifact
        this.processBuffer(events);
        return events;
    }
    processBuffer(events) {
        // If we're inside a file action, look for its closing tag
        if (this.currentFile) {
            const closeTag = '</logicAction>';
            const closeIdx = this.buffer.indexOf(closeTag);
            if (closeIdx !== -1) {
                // File completed
                this.currentFile.chunks.push(this.buffer.substring(0, closeIdx));
                const content = this.currentFile.chunks.join('').replace(/^\n/, '').replace(/\n$/, '');
                const event = {
                    filePath: this.currentFile.path,
                    content,
                    language: detectLanguage(this.currentFile.path),
                };
                events.push(event);
                this.completedFiles.push(event);
                this.currentFile = null;
                this.buffer = this.buffer.substring(closeIdx + closeTag.length);
                // Continue processing remaining buffer
                this.processBuffer(events);
                return;
            }
            // File still in progress — keep accumulating
            return;
        }
        // Look for new file action opening
        const fileActionRegex = /<logicAction\s+type="file"\s+filePath="([^"]*)">/;
        const match = this.buffer.match(fileActionRegex);
        if (match && match.index !== undefined) {
            const filePath = match[1];
            const afterTag = match.index + match[0].length;
            this.currentFile = { path: filePath, chunks: [] };
            this.buffer = this.buffer.substring(afterTag);
            // Continue processing to check if close tag is already in buffer
            this.processBuffer(events);
            return;
        }
        // Also handle reversed attribute order: filePath before type
        const altRegex = /<logicAction\s+filePath="([^"]*)"\s+type="file">/;
        const altMatch = this.buffer.match(altRegex);
        if (altMatch && altMatch.index !== undefined) {
            const filePath = altMatch[1];
            const afterTag = altMatch.index + altMatch[0].length;
            this.currentFile = { path: filePath, chunks: [] };
            this.buffer = this.buffer.substring(afterTag);
            this.processBuffer(events);
            return;
        }
        // Handle shell action (self-closing)
        const shellRegex = /<logicAction\s+type="shell"\s+command="[^"]*"\s*\/>/;
        const shellMatch = this.buffer.match(shellRegex);
        if (shellMatch && shellMatch.index !== undefined) {
            this.buffer = this.buffer.substring(shellMatch.index + shellMatch[0].length);
            this.processBuffer(events);
            return;
        }
        // Detect end of artifact
        if (this.buffer.includes('</logicArtifact>')) {
            this.insideArtifact = false;
            this.buffer = '';
        }
        // Keep buffer trimmed to avoid unbounded growth (keep last 200 chars for tag detection)
        if (!this.currentFile && this.buffer.length > 500) {
            this.buffer = this.buffer.substring(this.buffer.length - 200);
        }
    }
    /** Get all files completed so far */
    getCompletedFiles() {
        return [...this.completedFiles];
    }
    /** Check if currently inside an artifact */
    isStreaming() {
        return this.insideArtifact;
    }
    /** Reset the streamer state */
    reset() {
        this.buffer = '';
        this.currentFile = null;
        this.insideArtifact = false;
        this.completedFiles = [];
    }
}
//# sourceMappingURL=artifact-streamer.js.map