import type {PanDto} from "../../../api/generated/model";
import {IngredientType} from "../../../model/ingredient";

export interface FilterOptions {
    selectedUsers: number[];
    selectedRatings: number[];
    selectedIngredientCounts: string[];
}

export function getUniqueUsers(pans: PanDto[]): Array<{ id: number; name: string }> {
    const userMap = new Map<number, string>();
    pans.forEach(pan => {
        if (pan.author) {
            userMap.set(pan.author.id, pan.author.name);
        }
    });
    return Array.from(userMap.entries()).map(([id, name]) => ({id, name}));
}

export function getUniqueRatings(pans: PanDto[]): number[] {
    const ratings = new Set<number>();
    pans.forEach(pan => {
        if (pan.rating && pan.rating > 0) {
            // Use the exact rating value, not floored
            ratings.add(Math.round(pan.rating * 10) / 10); // Round to 1 decimal place
        }
    });
    return Array.from(ratings).sort((a, b) => b - a); // Sort descending
}

export function getIngredientCountRanges(pans: PanDto[]): string[] {
    const ranges = new Set<string>();
    pans.forEach(pan => {
        const totalCount = pan.ingredients.length;
        if (totalCount <= 3) ranges.add('1-3');
        else if (totalCount <= 6) ranges.add('4-6');
        else if (totalCount <= 9) ranges.add('7-9');
        else ranges.add('10+');
    });
    // Sort ranges in natural order: 1-3, 4-6, 7-9, 10+
    const rangeOrder = ['1-3', '4-6', '7-9', '10+'];
    return Array.from(ranges).sort((a, b) => rangeOrder.indexOf(a) - rangeOrder.indexOf(b));
}

export function filterPans(pans: PanDto[], filters: FilterOptions): PanDto[] {
    return pans.filter(pan => {
        // User filter
        if (filters.selectedUsers.length > 0 && !filters.selectedUsers.includes(pan.user_id)) {
            return false;
        }

        // Rating filter
        if (filters.selectedRatings.length > 0) {
            const panRating = pan.rating ? Math.round(pan.rating * 10) / 10 : 0;
            if (!filters.selectedRatings.includes(panRating)) {
                return false;
            }
        }

        // Ingredient count filter
        if (filters.selectedIngredientCounts.length > 0) {
            const totalCount = pan.ingredients.length;
            let range = '';
            if (totalCount <= 3) range = '1-3';
            else if (totalCount <= 6) range = '4-6';
            else if (totalCount <= 9) range = '7-9';
            else range = '10+';

            if (!filters.selectedIngredientCounts.includes(range)) {
                return false;
            }
        }

        return true;
    });
}

export function sortPans(pans: PanDto[], sortField: 'time' | 'rating' | 'counts', sortDirection: 'asc' | 'desc'): PanDto[] {
    const sorted = [...pans];

    switch (sortField) {
        case 'time':
            sorted.sort((a, b) => {
                const dateA = new Date(a.timestamp).getTime();
                const dateB = new Date(b.timestamp).getTime();
                return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
            });
            break;
        case 'rating':
            sorted.sort((a, b) => {
                const ratingA = a.rating || 0;
                const ratingB = b.rating || 0;
                return sortDirection === 'asc' ? ratingA - ratingB : ratingB - ratingA;
            });
            break;
        case 'counts':
            sorted.sort((a, b) => {
                const ingredientCountA = a.ingredients.filter(i => i.type === IngredientType.FILL).length;
                const sauceCountA = a.ingredients.filter(i => i.type === IngredientType.SAUCE).length;
                const totalCountA = ingredientCountA + sauceCountA;

                const ingredientCountB = b.ingredients.filter(i => i.type === IngredientType.FILL).length;
                const sauceCountB = b.ingredients.filter(i => i.type === IngredientType.SAUCE).length;
                const totalCountB = ingredientCountB + sauceCountB;

                return sortDirection === 'asc' ? totalCountA - totalCountB : totalCountB - totalCountA;
            });
            break;
    }

    return sorted;
}
