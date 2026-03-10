/**
 * Deploy a project's HTML to a static file, returning a public URL.
 * Handles both raw HTML (web projects) and JSON file arrays (code projects).
 */
export declare function deployProject(deployId: string, content: string): Promise<string>;
/**
 * Check if a deploy exists.
 */
export declare function getDeployStatus(deployId: string): {
    exists: boolean;
    url?: string;
};
/**
 * Remove a deployed project.
 */
export declare function removeDeploy(deployId: string): void;
/** Get the deploy directory path for Express static serving */
export declare function getDeployDir(): string;
//# sourceMappingURL=deploy.d.ts.map