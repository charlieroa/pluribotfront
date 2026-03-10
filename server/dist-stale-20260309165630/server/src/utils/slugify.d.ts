/**
 * Normalize text to a URL-safe slug (lowercase, no accents, hyphens).
 */
export declare function slugify(text: string): string;
/**
 * Validate a slug: 3-63 chars, alphanumeric + hyphens, no reserved words.
 */
export declare function isSlugValid(slug: string): {
    valid: boolean;
    error?: string;
};
/**
 * Check if a slug is available in the database.
 */
export declare function isSlugAvailable(slug: string): Promise<boolean>;
/**
 * Generate a unique slug from a title, appending -2, -3, etc. if taken.
 */
export declare function generateUniqueSlug(title: string): Promise<string>;
//# sourceMappingURL=slugify.d.ts.map