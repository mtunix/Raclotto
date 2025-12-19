/**
 * Centralized color map for ingredient tags
 * Used across the frontend for consistent tag styling
 */

export interface TagColorConfig {
    backgroundColor: string;
    color: string;
    backgroundColorHover?: string;
    backgroundColorSelected?: string;
}

export const TAG_COLORS: Record<string, TagColorConfig> = {
    meat: {
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        color: '#ff3b30',
        backgroundColorHover: 'rgba(255, 59, 48, 0.15)',
        backgroundColorSelected: 'rgba(255, 59, 48, 0.25)'
    },
    vegan: {
        backgroundColor: 'rgba(50, 205, 50, 0.1)',
        color: '#32cd32',
        backgroundColorHover: 'rgba(50, 205, 50, 0.15)',
        backgroundColorSelected: 'rgba(50, 205, 50, 0.25)'
    },
    vegetarian: {
        backgroundColor: 'rgba(34, 139, 34, 0.1)',
        color: '#228b22',
        backgroundColorHover: 'rgba(34, 139, 34, 0.15)',
        backgroundColorSelected: 'rgba(34, 139, 34, 0.25)'
    },
    fish: {
        backgroundColor: 'rgba(0, 119, 190, 0.1)',
        color: '#0077BE',
        backgroundColorHover: 'rgba(0, 119, 190, 0.15)',
        backgroundColorSelected: 'rgba(0, 119, 190, 0.25)'
    },
    histamine: {
        backgroundColor: 'rgba(255, 149, 0, 0.1)',
        color: '#ff9500',
        backgroundColorHover: 'rgba(255, 149, 0, 0.15)',
        backgroundColorSelected: 'rgba(255, 149, 0, 0.25)'
    },
    gluten: {
        backgroundColor: 'rgba(255, 204, 0, 0.1)',
        color: '#ffcc00',
        backgroundColorHover: 'rgba(255, 204, 0, 0.15)',
        backgroundColorSelected: 'rgba(255, 204, 0, 0.25)'
    },
    lactose: {
        backgroundColor: 'rgba(90, 200, 250, 0.1)',
        color: '#5ac8fa',
        backgroundColorHover: 'rgba(90, 200, 250, 0.15)',
        backgroundColorSelected: 'rgba(90, 200, 250, 0.25)'
    },
    fructose: {
        backgroundColor: 'rgba(175, 82, 222, 0.1)',
        color: '#af52de',
        backgroundColorHover: 'rgba(175, 82, 222, 0.15)',
        backgroundColorSelected: 'rgba(175, 82, 222, 0.25)'
    },
    spicy: {
        backgroundColor: 'rgba(255, 69, 58, 0.1)',
        color: '#ff453a',
        backgroundColorHover: 'rgba(255, 69, 58, 0.15)',
        backgroundColorSelected: 'rgba(255, 69, 58, 0.25)'
    },
    wildcard: {
        backgroundColor: 'rgba(255, 159, 10, 0.1)',
        color: '#ff9f0a',
        backgroundColorHover: 'rgba(255, 159, 10, 0.15)',
        backgroundColorSelected: 'rgba(255, 159, 10, 0.25)'
    },
    sweet: {
        backgroundColor: 'rgba(255, 45, 85, 0.1)',
        color: '#ff2d55',
        backgroundColorHover: 'rgba(255, 45, 85, 0.15)',
        backgroundColorSelected: 'rgba(255, 45, 85, 0.25)'
    }
};

/**
 * Get tag color configuration for a given tag name
 */
export function getTagColors(tagName: string): TagColorConfig {
    return TAG_COLORS[tagName] || {
        backgroundColor: 'rgba(142, 142, 147, 0.1)',
        color: '#8e8e93',
        backgroundColorHover: 'rgba(142, 142, 147, 0.15)',
        backgroundColorSelected: 'rgba(142, 142, 147, 0.2)'
    };
}

