import type { ProjectArtifact } from '../../../shared/types.js';
export declare const INLINE_POLYFILL_PACKAGES: Record<string, string>;
export declare const POLYFILL_GLOBALS: Record<string, string>;
export declare const INLINE_UTILS: Record<string, {
    code: string;
    globalName: string;
}>;
/**
 * Build the global name map for a set of packages.
 * Includes polyfill globals, inline utils, and auto-mapped names.
 */
export declare function buildGlobalMap(packages: string[]): Record<string, string>;
/**
 * Build the import map object for <script type="importmap">.
 * Pins react@18.3.1, uses ?external=react,react-dom for React-dependent packages.
 */
export declare function buildImportMap(packages: string[]): {
    imports: Record<string, string>;
};
/**
 * Build the <script type="module"> package loader code.
 * Dynamically imports packages from esm.sh and assigns to window globals.
 * Skips packages that already have polyfill overrides loaded.
 */
export declare function buildModuleLoader(packages: string[], globalMap: Record<string, string>): string;
/**
 * Build polyfill inline code for detected packages.
 * Polyfills run synchronously before the module loader as a safety net.
 */
export declare function buildFallbackPolyfillCode(packages: string[]): string;
/** @deprecated Alias for buildFallbackPolyfillCode */
export declare const getPolyfillInlineCode: typeof buildFallbackPolyfillCode;
/**
 * Collapse multi-line import statements into single lines for easier regex matching.
 */
export declare function collapseMultiLineImports(code: string): string;
/**
 * Scan source code for imports of packages not in package.json.
 */
export declare function detectImportedPackages(files: {
    filePath: string;
    content: string;
}[]): string[];
/**
 * Transform external imports to use CDN globals.
 * Relative imports (./xxx, ../xxx) are stripped (they're inlined).
 * Handles both single-line and multi-line import statements.
 */
export declare function transformImportsForCDN(code: string, globalMap: Record<string, string>): string;
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
 * Legacy: resolve package.json dependencies to CDN scripts.
 * Used when PREVIEW_ENGINE=cdn (rollback mode).
 */
export declare function resolveCDNDependencies(artifact: ProjectArtifact): CDNResolution;
export declare function getAvailablePackageNames(): string[];
//# sourceMappingURL=cdn-resolver.d.ts.map