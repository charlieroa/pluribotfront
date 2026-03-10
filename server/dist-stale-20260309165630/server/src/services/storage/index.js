import { LocalStorageProvider } from './local.js';
import { S3StorageProvider } from './s3.js';
let instance = null;
export function getStorageProvider() {
    if (!instance) {
        const provider = process.env.STORAGE_PROVIDER ?? 'local';
        switch (provider) {
            case 's3':
                instance = new S3StorageProvider();
                break;
            case 'local':
            default:
                instance = new LocalStorageProvider();
                break;
        }
    }
    return instance;
}
//# sourceMappingURL=index.js.map