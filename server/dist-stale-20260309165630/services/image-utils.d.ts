export declare const SUPPORTED_IMAGE_TYPES: Set<string>;
export declare function detectImageMimeType(buffer: Buffer): string;
export declare function readAndEncodeImage(imageUrl: string): Promise<{
    source: string;
    mediaType: string;
} | null>;
//# sourceMappingURL=image-utils.d.ts.map