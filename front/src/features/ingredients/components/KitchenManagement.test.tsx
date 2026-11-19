import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useAppStore } from '../../../AppSlice';
import { IngredientType, type IngredientForUserDto, type SessionDto } from '../../../api/generated/model';
import { ingredient, ingredientsForUser, prepType, prepTypes, session } from '../../../lib/api/__fixtures__/backendResponses';
import { FakeTransport } from '../../../lib/api/fakeTransport';
import { setTransport, type Transport } from '../../../lib/api/transport';
import { renderRoute } from '../../../testUtils';
import { KitchenManagement } from './KitchenManagement';

const [potato, , aioli, leek] = ingredientsForUser;
const [defaultPrepType] = prepTypes;

let fake: FakeTransport;
let previous: Transport;
let stock: IngredientForUserDto[];

beforeEach(() => {
    stock = ingredientsForUser;
    fake = new FakeTransport()
        .on('GET', '/ingredients', () => stock)
        .on('GET', '/ingredients/available-counts', {})
        .on('GET', '/preparation_type', prepTypes);
    previous = setTransport(fake);
});

afterEach(() => {
    setTransport(previous);
});

const fetches = (path: string) => fake.requests.filter((r) => r.method === 'GET' && r.path === path).length;
const buttonWith = (label: string, scope: HTMLElement = document.body) =>
    within(scope).getByText(label).closest('button') as HTMLElement;
const itemOf = (name: string) => screen.getByText(name).closest('.item-list-row') as HTMLElement;
const deleteButtonOf = (name: string) => itemOf(name).querySelector('.confirm-delete-button') as HTMLElement;

// Changes refetch through SWR's global cache, so every test gets a session key of its own.
let sessions = 0;
async function renderKitchen(): Promise<SessionDto> {
    sessions += 1;
    const current = { ...session, key: `kitchen-${sessions}` };
    useAppStore.setState({ session: current });
    renderRoute(<KitchenManagement />, { sharedCache: true });
    await screen.findByText(potato.name as string);
    return current;
}

async function openTab(label: string) {
    fireEvent.click(screen.getByText(label));
    await waitFor(() => expect(screen.getByText(label).closest('.ant-segmented-item')).toHaveClass('ant-segmented-item-selected'));
}

describe('ingredients and sauces', () => {
    it("lists the session's fills, with what the diet rules out folded away", async () => {
        const current = await renderKitchen();

        expect(fake.last('GET', '/ingredients')?.query).toEqual({ session_key: current.key });
        expect(screen.getByText(leek.name as string)).toBeInTheDocument();
        expect(screen.queryByText(aioli.name as string)).not.toBeInTheDocument();
        expect(screen.queryByText('Pork')).not.toBeInTheDocument();

        fireEvent.click(screen.getByText('ingredient.nonApplicable'));

        expect(await screen.findByText('Pork')).toBeInTheDocument();
    });

    it('lists the sauces on their own tab', async () => {
        await renderKitchen();

        await openTab('ingredient.sauces');
        fireEvent.click(screen.getByText('ingredient.nonApplicable'));

        expect(await screen.findByText(aioli.name as string)).toBeInTheDocument();
        expect(screen.queryByText(potato.name as string)).not.toBeInTheDocument();
    });

    it('takes an ingredient out of the stock on the second click only', async () => {
        const current = await renderKitchen();
        fake.on('DELETE', `/ingredients/${potato.id}`, () => {
            stock = stock.map((i) => (i.id === potato.id ? { ...i, available: false } : i));
            return undefined;
        });

        fireEvent.click(deleteButtonOf(potato.name as string));
        expect(fake.last('DELETE', `/ingredients/${potato.id}`)).toBeUndefined();
        fireEvent.click(deleteButtonOf(potato.name as string));

        expect(fake.last('DELETE', `/ingredients/${potato.id}`)?.query).toEqual({ session_key: current.key });
        expect(await screen.findByText('ingredient.unavailable')).toBeInTheDocument();
        expect(screen.queryByText(potato.name as string)).not.toBeInTheDocument();
        expect(fetches('/ingredients')).toBe(2);
    });

    it('edits an ingredient, then opens the next one as it is', async () => {
        await renderKitchen();
        fake.on('PATCH', `/ingredients/${leek.id}`, { ...ingredient, name: 'Ramps' });

        fireEvent.click(within(itemOf(leek.name as string)).getByTitle('common.edit'));
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByPlaceholderText('common.enterName')).toHaveValue(leek.name);
        fireEvent.change(within(dialog).getByPlaceholderText('common.enterName'), { target: { value: 'Ramps' } });
        fireEvent.click(buttonWith('common.save', dialog));

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(fake.last('PATCH', `/ingredients/${leek.id}`)?.body).toMatchObject({
            name: 'Ramps',
            type: IngredientType.FILL,
            spicy: leek.spicy,
            vegan: true,
            vegetarian: false,
        });
        await waitFor(() => expect(fetches('/ingredients')).toBe(2));

        fireEvent.click(within(itemOf(potato.name as string)).getByTitle('common.edit'));
        expect(within(await screen.findByRole('dialog')).getByPlaceholderText('common.enterName')).toHaveValue(potato.name);
    });

    it('adds a sauce from the sauces tab', async () => {
        const current = await renderKitchen();
        fake.on('POST', '/ingredients', { ...ingredient, name: 'Chili', type: IngredientType.SAUCE });
        await openTab('ingredient.sauces');

        fireEvent.click(buttonWith('ingredient.addSauce'));
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByRole('radio', { name: 'ingredient.sauce' })).toBeChecked();
        fireEvent.change(within(dialog).getByPlaceholderText('common.enterName'), { target: { value: 'Chili' } });
        fireEvent.click(buttonWith('common.create', dialog));

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(fake.last('POST', '/ingredients')?.query).toEqual({ session_key: current.key });
        expect(fake.last('POST', '/ingredients')?.body).toMatchObject({ name: 'Chili', type: IngredientType.SAUCE });
    });
});

describe('preparation types', () => {
    it("lists the defaults and the session's own, and lets only the session's own be deleted", async () => {
        fake.on('GET', '/preparation_type', [...prepTypes, prepType]);
        const current = await renderKitchen();

        await openTab('ingredient.preparationTypes');

        expect(fake.last('GET', '/preparation_type')?.query).toEqual({ session_key: current.key });
        expect(within(itemOf(defaultPrepType.name)).getByText('(ingredient.default)')).toBeInTheDocument();
        expect(deleteButtonOf(defaultPrepType.name)).toBeNull();
        expect(within(itemOf(prepType.name)).queryByText('(ingredient.default)')).not.toBeInTheDocument();
        expect(deleteButtonOf(prepType.name)).toBeInTheDocument();
    });

    it("deletes a session's preparation type on the second click only", async () => {
        let listed = [...prepTypes, prepType];
        fake.on('GET', '/preparation_type', () => listed)
            .on('DELETE', `/preparation_type/${prepType.id}`, () => {
                listed = prepTypes;
                return undefined;
            });
        await renderKitchen();
        await openTab('ingredient.preparationTypes');

        fireEvent.click(deleteButtonOf(prepType.name));
        expect(fake.last('DELETE', `/preparation_type/${prepType.id}`)).toBeUndefined();
        fireEvent.click(deleteButtonOf(prepType.name));

        expect(await screen.findByText('ingredient.preparationTypeDeleted')).toBeInTheDocument();
        expect(fake.last('DELETE', `/preparation_type/${prepType.id}`)).toBeDefined();
        await waitFor(() => expect(screen.queryByText(prepType.name)).not.toBeInTheDocument());
        expect(screen.getByText(defaultPrepType.name)).toBeInTheDocument();
    });

    it('adds a preparation type with a name', async () => {
        let listed = prepTypes;
        fake.on('GET', '/preparation_type', () => listed)
            .on('POST', '/preparation_type', () => {
                listed = [...prepTypes, prepType];
                return prepType;
            });
        const current = await renderKitchen();
        await openTab('ingredient.preparationTypes');

        fireEvent.click(buttonWith('ingredient.addPreparationType'));
        const name = screen.getByPlaceholderText('ingredient.preparationTypeName');
        fireEvent.change(name, { target: { value: '   ' } });
        expect(buttonWith('common.save')).toBeDisabled();
        fireEvent.change(name, { target: { value: ` ${prepType.name} ` } });
        fireEvent.click(buttonWith('common.save'));

        expect(fake.last('POST', '/preparation_type')?.body).toEqual({ name: prepType.name });
        expect(fake.last('POST', '/preparation_type')?.query).toEqual({ session_key: current.key });
        expect(await screen.findByText(prepType.name)).toBeInTheDocument();
        expect(screen.queryByPlaceholderText('ingredient.preparationTypeName')).not.toBeInTheDocument();
        expect(buttonWith('ingredient.addPreparationType')).toBeInTheDocument();
    });

    it('drops an unsaved preparation type on cancel', async () => {
        await renderKitchen();
        await openTab('ingredient.preparationTypes');

        fireEvent.click(buttonWith('ingredient.addPreparationType'));
        fireEvent.change(screen.getByPlaceholderText('ingredient.preparationTypeName'), { target: { value: 'Grill' } });
        fireEvent.click(buttonWith('common.cancel'));
        fireEvent.click(buttonWith('ingredient.addPreparationType'));

        expect(screen.getByPlaceholderText('ingredient.preparationTypeName')).toHaveValue('');
        expect(fake.last('POST', '/preparation_type')).toBeUndefined();
    });
});
