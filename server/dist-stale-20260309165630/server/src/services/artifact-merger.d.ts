import type { ProjectArtifact } from '../../../shared/types.js';
/**
 * Merge a partial update artifact with a base artifact.
 * - Files in update replace matching files in base
 * - New files in update are added
 * - Files in base not mentioned in update are kept unchanged
 */
export declare function mergeArtifacts(base: ProjectArtifact, update: ProjectArtifact): ProjectArtifact;
/**
 * Format a ProjectArtifact as context string for the LLM refinement prompt.
 * Shows file tree + truncated file contents for context efficiency.
 */
export declare function formatArtifactAsContext(artifact: ProjectArtifact): string;
//# sourceMappingURL=artifact-merger.d.ts.map