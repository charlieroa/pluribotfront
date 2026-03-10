export interface NetlifyDeployResult {
    url: string;
    siteId: string;
    deployId: string;
    adminUrl: string;
}
export declare function deployToNetlify(htmlContent: string, existingSiteId?: string): Promise<NetlifyDeployResult>;
//# sourceMappingURL=netlify-deploy.d.ts.map