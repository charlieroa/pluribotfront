import type { ProjectArtifact } from '../../../shared/types.js';
export interface CDNPackageInfo {
    cdnUrl: string;
    globalName: string;
}
export interface CDNResolution {
    scriptTags: string[];
    inlineSetup: string;
    globalMap: Record<string, string>;
}
/**
 * Resolve package.json dependencies to CDN scripts and global mappings
 */
export declare function resolveCDNDependencies(artifact: ProjectArtifact): CDNResolution;
/**
 * Also scan source code for imports of packages not in package.json
 * (in case Logic didn't generate a package.json or forgot a dep)
 */
export declare function detectImportedPackages(files: {
    filePath: string;
    content: string;
}[]): string[];
/**
 * Transform external imports to use CDN globals.
 * Relative imports (./xxx, ../xxx) are stripped (they're inlined).
 */
export declare function transformImportsForCDN(code: string, globalMap: Record<string, string>): string;
//# sourceMappingURL=cdn-resolver.d.ts.map