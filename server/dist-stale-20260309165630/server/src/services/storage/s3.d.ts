import type { StorageProvider } from './types.js';
export declare class S3StorageProvider implements StorageProvider {
    upload(_buffer: Buffer, _filename: string, _mimetype: string): Promise<string>;
    getUrl(_filePath: string): string;
    delete(_filePath: string): Promise<void>;
}
//# sourceMappingURL=s3.d.ts.map