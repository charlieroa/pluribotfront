import type { StorageProvider } from './types.js';
export declare class LocalStorageProvider implements StorageProvider {
    upload(buffer: Buffer, filename: string, _mimetype: string): Promise<string>;
    getUrl(filePath: string): string;
    delete(filePath: string): Promise<void>;
}
//# sourceMappingURL=local.d.ts.map