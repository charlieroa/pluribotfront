/**
 * Transforms a multi-file code project (JSON array of {path, content})
 * into a single self-contained HTML file that runs in the browser.
 *
 * Uses React UMD + Babel standalone for JSX compilation + esm.sh for external deps.
 */
/**
 * Check if a string looks like a multi-file code project (JSON array of files).
 */
export declare function isCodeProject(content: string): boolean;
/**
 * Build a self-contained HTML page from a multi-file code project.
 */
export declare function buildCodeProjectHtml(content: string): string;
//# sourceMappingURL=code-to-html.d.ts.map