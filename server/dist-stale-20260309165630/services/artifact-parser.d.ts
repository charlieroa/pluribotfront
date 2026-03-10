import type { ProjectArtifact, ArtifactFile } from '../../../shared/types.js';
export declare function detectLanguage(filePath: string): string;
export declare function parseArtifact(rawOutput: string): ProjectArtifact | null;
export declare function extractFilesFromArtifact(artifact: ProjectArtifact): ArtifactFile[];
export declare function bundleToHtml(artifact: ProjectArtifact): string;
//# sourceMappingURL=artifact-parser.d.ts.map