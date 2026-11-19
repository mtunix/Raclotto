import { IngredientType } from "../../../api/generated/model";
import type { AvailableCountsDto, IngredientForUserDto } from "../../../api/generated/model";
import { countOr } from "../countOr";

/** Of a session's available ingredients of one type, how many the user's diet allows. */
export interface Availability {
    allowed: number;
    total: number;
}

export interface BanditLimits {
    /** What the reels show: the available ingredients the user's diet allows. */
    items: IngredientForUserDto[];
    fills: Availability;
    sauces: Availability;
    maxColumns: number;
}

export function banditLimits(ingredients: IngredientForUserDto[], counts?: AvailableCountsDto): BanditLimits {
    const available = ingredients.filter((i) => i.available);
    const items = available.filter((i) => i.applicable);
    const ofType = (list: IngredientForUserDto[], type: IngredientType) => list.filter((i) => i.type === type).length;
    const fills = {
        allowed: countOr(counts?.fill_count, ofType(items, IngredientType.FILL)),
        total: ofType(available, IngredientType.FILL),
    };
    const sauces = {
        allowed: countOr(counts?.sauce_count, ofType(items, IngredientType.SAUCE)),
        total: ofType(available, IngredientType.SAUCE),
    };
    return { items, fills, sauces, maxColumns: Math.min(items.length, fills.allowed + sauces.allowed) };
}

export function isRestricted({ allowed, total }: Availability): boolean {
    return allowed < total;
}
