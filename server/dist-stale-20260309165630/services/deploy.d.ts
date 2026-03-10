/**
 * Deploy a project's HTML to a static file, returning a public URL.
 */
export declare function deployProject(deployId: string, htmlContent: string): Promise<string>;
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