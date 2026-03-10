export class S3StorageProvider {
    async upload(_buffer, _filename, _mimetype) {
        throw new Error('S3StorageProvider is not implemented. Install @aws-sdk/client-s3 and implement this class.');
    }
    getUrl(_filePath) {
        throw new Error('S3StorageProvider is not implemented.');
    }
    async delete(_filePath) {
        throw new Error('S3StorageProvider is not implemented.');
    }
}
//# sourceMappingURL=s3.js.map