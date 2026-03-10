import type { ProjectArtifact, ArtifactFile } from '../../../shared/types.js';
export interface CompilationDiagnostic {
    file: string;
    line: number;
    message: string;
    category: 'error' | 'warning';
}
export interface BundleResult {
    html: string;
    diagnostics: CompilationDiagnostic[];
}
export declare function detectLanguage(filePath: string): string;
export declare function parseArtifact(rawOutput: string): ProjectArtifact | null;
export declare function extractFilesFromArtifact(artifact: ProjectArtifact): ArtifactFile[];
/**
 * Strip all export syntax from code. Handles:
 * - export default function Name / export default class Name
 * - export default anonymous (arrow, function(), class)
 * - export function / export const / export let / export var / export async function
 * - export class / export interface / export type / export enum
 * - export { A, B } (named export list)
 * - export { default as X } from '...' (re-exports)
 * - export * from '...'
 *
 * Returns: { code: string, defaultExportName: string | null }
 */
export declare function stripExports(code: string, filePath: string): {
    code: string;
    defaultExportName: string | null;
};
export declare function bundleToHtml(artifact: ProjectArtifact, supabaseConfig?: {
    url: string;
    anonKey: string;
}): BundleResult;
//# sourceMappingURL=artifact-parser.d.ts.map