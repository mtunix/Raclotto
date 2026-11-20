import { useIngredientStore } from './ingredientStore';

const store = () => useIngredientStore.getState();
const saved = (): unknown => JSON.parse(localStorage.getItem('ingredient-storage') ?? 'null');

beforeEach(() => {
    localStorage.clear();
    useIngredientStore.setState({ ingredientCount: 0, sauceCount: 0 });
});

afterEach(() => {
    vi.restoreAllMocks();
});

function save(state: object) {
    localStorage.setItem('ingredient-storage', JSON.stringify({ state, version: 0 }));
}

const reload = () => useIngredientStore.persist.rehydrate();

it('saves the counts under its own key only', () => {
    store().updateCount('fill', 2);
    store().increment('sauce');

    expect(saved()).toEqual({ state: { ingredientCount: 2, sauceCount: 1 }, version: 0 });
    expect(localStorage.getItem('numFill')).toBeNull();
    expect(localStorage.getItem('numSauce')).toBeNull();
});

it('restores the saved counts', async () => {
    save({ ingredientCount: 2, sauceCount: 1 });

    await reload();

    expect(store()).toMatchObject({ ingredientCount: 2, sauceCount: 1 });
});

it('takes over the counts saved under the old keys once', async () => {
    localStorage.clear();
    localStorage.setItem('numFill', '3');
    localStorage.setItem('numSauce', '1');

    await reload();

    expect(store()).toMatchObject({ ingredientCount: 3, sauceCount: 1 });
    expect(localStorage.getItem('numFill')).toBeNull();
    expect(localStorage.getItem('numSauce')).toBeNull();
});

it('prefers its own saved counts to the old keys', async () => {
    save({ ingredientCount: 1, sauceCount: 0 });
    localStorage.setItem('numFill', '3');

    await reload();

    expect(store().ingredientCount).toBe(1);
    expect(localStorage.getItem('numFill')).toBeNull();
});

it('ignores saved counts that are no count', async () => {
    save({ ingredientCount: 'x', sauceCount: -1 });
    localStorage.setItem('numFill', 'abc');

    await reload();

    expect(store()).toMatchObject({ ingredientCount: 0, sauceCount: 0 });
});

it('keeps each count between zero and what is available', () => {
    store().updateCount('fill', 9, 4);
    expect(store().ingredientCount).toBe(4);
    store().increment('fill', 4);
    expect(store().ingredientCount).toBe(4);

    store().updateCount('sauce', -2);
    expect(store().sauceCount).toBe(0);
    store().decrement('sauce');
    expect(store().sauceCount).toBe(0);
    store().increment('sauce');
    expect(store().sauceCount).toBe(1);
});

it('counts on without storage', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('quota', 'QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('denied', 'SecurityError');
    });

    store().increment('fill');
    await reload();
    store().increment('fill');

    expect(store().ingredientCount).toBe(2);
});
