import { useState, useEffect } from 'react';
import { getLocalStorageNumber } from '../utils/generateViewUtils';

export function useIngredientCount(
    initialValue: number,
    storageKey: string,
    setCountInStore: (count: number) => void,
    availableCount: number
) {
    const [count, setCount] = useState(initialValue);

    const updateCount = (newCount: number) => {
        const clampedCount = Math.max(0, Math.min(newCount, availableCount));
        setCount(clampedCount);
        localStorage.setItem(storageKey, String(clampedCount));
        setCountInStore(clampedCount);
    };

    const increment = () => {
        updateCount(count + 1);
    };

    const decrement = () => {
        updateCount(count - 1);
    };

    return {
        count,
        updateCount,
        increment,
        decrement
    };
}
