export interface StorageProvider {
  /** Upload a file and return its public path (e.g. /uploads/foo.png) */
  upload(buffer: Buffer, filename: string, mimetype: string): Promise<string>
  /** Return the public URL for a stored file path */
  getUrl(filePath: string): string
  /** Delete a file by its stored path */
  delete(filePath: string): Promise<void>
}
