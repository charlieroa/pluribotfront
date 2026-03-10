export interface FileUpdateEvent {
    filePath: string;
    content: string;
    language: string;
}
export interface StreamEvent {
    type: 'artifact_start' | 'file_update';
    filePath?: string;
    content?: string;
    language?: string;
    partial?: boolean;
}
/**
 * ArtifactStreamer — parses logicArtifact XML tags from streaming tokens
 * in real-time, emitting file_update events as each file completes.
 * Also emits artifact_start when the artifact block is first detected,
 * and partial file_update events while files are being written.
 */
export declare class ArtifactStreamer {
    private buffer;
    private currentFile;
    private insideArtifact;
    private artifactStarted;
    private completedFiles;
    private lastPartialLength;
    private static readonly PARTIAL_THRESHOLD;
    /**
     * Feed a new token into the streamer.
     * Returns StreamEvent[] — may include artifact_start, partial file_update, or complete file_update.
     */
    onToken(token: string): StreamEvent[];
    private processBuffer;
    /** Get all files completed so far */
    getCompletedFiles(): FileUpdateEvent[];
    /** Check if currently inside an artifact */
    isStreaming(): boolean;
    /** Reset the streamer state */
    reset(): void;
}
//# sourceMappingURL=artifact-streamer.d.ts.map