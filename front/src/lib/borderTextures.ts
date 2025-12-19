/**
 * Utility functions for border textures.
 * Maps texture names to CSS border-image URLs or patterns.
 */

export type TextureName = 'cheese' | 'bread' | 'sauce-01' | 'sauce-02' | 'herbs-01' | 'herbs-02';

/**
 * Get the border-image CSS value for a given texture name.
 * @param textureName The name of the texture, or null for no texture
 * @returns CSS border-image value or undefined if no texture
 */
export function getTextureBorderImage(textureName: string | null | undefined): string | undefined {
    if (!textureName) {
        return undefined;
    }

    // Map texture names to image paths
    // Texture images should be placed in public/assets/textures/
    const texturePaths: Record<TextureName, string> = {
        cheese: '/assets/textures/cheese.png',
        bread: '/assets/textures/bread.png',
        'sauce-01': '/assets/textures/sauce-01.png',
        'sauce-02': '/assets/textures/sauce-02.png',
        'herbs-01': '/assets/textures/herbs-01.png',
        'herbs-02': '/assets/textures/herbs-02.png',
    };

    const path = texturePaths[textureName as TextureName];
    if (!path) {
        return undefined;
    }

    // Return border-image CSS value with slice value for proper tiling
    // The '30' value controls how the image is sliced for the border
    return `url(${path}) 30`;
}

/**
 * Get all available texture names.
 */
export function getAvailableTextures(): TextureName[] {
    return ['cheese', 'bread', 'sauce-01', 'sauce-02', 'herbs-01', 'herbs-02'];
}

