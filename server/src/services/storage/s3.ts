import type { StorageProvider } from './types.js'

export class S3StorageProvider implements StorageProvider {
  async upload(_buffer: Buffer, _filename: string, _mimetype: string): Promise<string> {
    throw new Error('S3StorageProvider is not implemented. Install @aws-sdk/client-s3 and implement this class.')
  }

  getUrl(_filePath: string): string {
    throw new Error('S3StorageProvider is not implemented.')
  }

  async delete(_filePath: string): Promise<void> {
    throw new Error('S3StorageProvider is not implemented.')
  }
}
