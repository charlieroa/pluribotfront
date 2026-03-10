export interface FileUpdateEvent {
    filePath: string;
    content: string;
    language: string;
}
/**
 * ArtifactStreamer — parses logicArtifact XML tags from streaming tokens
 * in real-time, emitting file_update events as each file completes.
 */
export declare class ArtifactStreamer {
    private buffer;
    private currentFile;
    private insideArtifact;
    private completedFiles;
    /**
     * Feed a new token into the streamer.
     * Returns any file_update events that completed with this token.
     */
    onToken(token: string): FileUpdateEvent[];
    private processBuffer;
    /** Get all files completed so far */
    getCompletedFiles(): FileUpdateEvent[];
    /** Check if currently inside an artifact */
    isStreaming(): boolean;
    /** Reset the streamer state */
    reset(): void;
}
//# sourceMappingURL=artifact-streamer.d.ts.map