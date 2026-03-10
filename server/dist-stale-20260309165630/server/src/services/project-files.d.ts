export interface ProjectFile {
    path: string;
    content: string;
}
export interface ValidatedProject {
    files: ProjectFile[];
    warnings: string[];
}
export declare function validateProjectFiles(input: unknown): ValidatedProject;
export declare function parseProjectFilesFromText(raw: string): ValidatedProject;
//# sourceMappingURL=project-files.d.ts.map