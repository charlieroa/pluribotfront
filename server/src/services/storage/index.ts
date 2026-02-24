import type { StorageProvider } from './types.js'
import { LocalStorageProvider } from './local.js'
import { S3StorageProvider } from './s3.js'

let instance: StorageProvider | null = null

export function getStorageProvider(): StorageProvider {
  if (!instance) {
    const provider = process.env.STORAGE_PROVIDER ?? 'local'
    switch (provider) {
      case 's3':
        instance = new S3StorageProvider()
        break
      case 'local':
      default:
        instance = new LocalStorageProvider()
        break
    }
  }
  return instance
}

export type { StorageProvider } from './types.js'
