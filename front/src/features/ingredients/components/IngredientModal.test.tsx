import type { ComponentProps } from 'react';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { create } from 'zustand';
import { useAppStore } from '../../../AppSlice';
import { IngredientType, type IngredientForUserDto } from '../../../api/generated/model';
import { ingredient, ingredientsForUser, session } from '../../../lib/api/__fixtures__/backendResponses';
import { FakeTransport } from '../../../lib/api/fakeTransport';
import { setTransport, type Transport } from '../../../lib/api/transport';
import { renderRoute } from '../../../testUtils';
import { IngredientModal } from './IngredientModal';

type ModalProps = ComponentProps<typeof IngredientModal>;

const [, pork, aioli] = ingredientsForUser;

const nothingTicked = {
    wildcard: false,
    sweet: false,
    meat: false,
    vegetarian: false,
    vegan: false,
    fish: false,
    gluten: false,
    histamine: false,
    fructose: false,
    lactose: false,
};

/** What saving an untouched ingredient sends back. */
const bodyOf = (dto: IngredientForUserDto) => ({
    name: dto.name,
    type: dto.type,
    spicy: dto.spicy,
    wildcard: dto.wildcard,
    sweet: dto.sweet,
    meat: dto.meat,
    vegetarian: dto.vegetarian,
    vegan: dto.vegan,
    fish: dto.fish,
    gluten: dto.gluten,
    histamine: dto.histamine,
    fructose: dto.fructose,
    lactose: dto.lactose,
});

let fake: FakeTransport;
let previous: Transport;
const onCancel = vi.fn(() => useModalProps.setState({ visible: false }));
const onSuccess = vi.fn();
const onSave = vi.fn((_id: number, _body: unknown) => Promise.resolve());
// The props the modal is shown with; tests change them as its parent would.
const useModalProps = create<ModalProps>(() => ({ visible: false, onCancel, mode: 'add' }));

function Parent() {
    return <IngredientModal {...useModalProps()} />;
}

beforeEach(() => {
    fake = new FakeTransport().on('POST', '/ingredients', ingredient);
    previous = setTransport(fake);
    useAppStore.setState({ session });
    onCancel.mockClear();
    onSuccess.mockClear();
    onSave.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
    setTransport(previous);
});

function show(props: Partial<ModalProps>) {
    act(() => useModalProps.setState(props));
}

function renderAdd(props: Partial<ModalProps> = {}) {
    useModalProps.setState({ visible: true, onCancel, mode: 'add', onSuccess, ingredient: null, initialType: IngredientType.FILL, context: 'ingredients', ...props }, true);
    renderRoute(<Parent />);
}

function renderEdit(dto: IngredientForUserDto) {
    useModalProps.setState({ visible: true, onCancel, mode: 'edit', ingredient: dto, onSave }, true);
    renderRoute(<Parent />);
}

const dialog = () => screen.getByRole('dialog');
const nameField = () => within(dialog()).getByPlaceholderText('common.enterName');
const radio = (label: string) => within(dialog()).getByRole('radio', { name: label });
const slider = () => within(dialog()).getByRole('slider');
const chip = (tag: string) => within(dialog()).getByText(`tags.${tag}`);
const button = (label: string) => within(dialog()).getByText(label).closest('button') as HTMLElement;

function press(label: string) {
    fireEvent.click(button(label));
}

const spiceUp = () => fireEvent.keyDown(slider(), { key: 'ArrowRight', keyCode: 39 });
const typeName = (name: string) => fireEvent.change(nameField(), { target: { value: name } });
const created = () => fake.last('POST', '/ingredients');

function fillInAndCancel() {
    typeName('Corn');
    fireEvent.click(radio('ingredient.sauce'));
    fireEvent.click(chip('meat'));
    fireEvent.click(chip('gluten'));
    spiceUp();
    fireEvent.click(within(dialog()).getByRole('checkbox', { name: 'ingredient.sweet' }));
    press('common.cancel');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
}

describe('adding', () => {
    it('creates an ingredient with the defaults: vegetarian, mild, nothing else', async () => {
        renderAdd();

        expect(within(dialog()).getByText('ingredient.addIngredient')).toBeInTheDocument();
        expect(nameField()).toHaveValue('');
        expect(radio('ingredient.fill')).toBeChecked();
        expect(slider()).toHaveAttribute('aria-valuenow', '0');
        typeName('Corn');
        press('common.create');

        await waitFor(() => expect(created()).toBeDefined());
        expect(created()?.query).toEqual({ session_key: session.key });
        expect(created()?.body).toEqual({ ...nothingTicked, name: 'Corn', type: IngredientType.FILL, spicy: 0, vegetarian: true });
        expect(await screen.findByText('ingredient.added')).toBeInTheDocument();
        expect(onSuccess).toHaveBeenCalled();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('creates what was picked', async () => {
        renderAdd();

        typeName('Chili');
        fireEvent.click(radio('ingredient.sauce'));
        fireEvent.click(chip('fish'));
        fireEvent.click(chip('gluten'));
        fireEvent.click(chip('lactose'));
        spiceUp();
        spiceUp();
        fireEvent.click(within(dialog()).getByRole('checkbox', { name: 'ingredient.sweet' }));
        fireEvent.click(within(dialog()).getByRole('checkbox', { name: 'ingredient.wildcard' }));
        press('common.create');

        await waitFor(() => expect(created()).toBeDefined());
        expect(created()?.body).toEqual({
            ...nothingTicked,
            name: 'Chili',
            type: IngredientType.SAUCE,
            spicy: 2,
            sweet: true,
            wildcard: true,
            fish: true,
            gluten: true,
            lactose: true,
        });
    });

    it('keeps one category at a time', async () => {
        renderAdd();

        typeName('Tuna');
        fireEvent.click(chip('meat'));
        fireEvent.click(chip('fish'));
        press('common.create');

        await waitFor(() => expect(created()).toBeDefined());
        expect(created()?.body).toMatchObject({ meat: false, vegetarian: false, vegan: false, fish: true });
    });

    it('takes the type from the initial type, else from the context', () => {
        renderAdd({ initialType: IngredientType.SAUCE, context: 'ingredients' });
        expect(within(dialog()).getByText('ingredient.addSauce')).toBeInTheDocument();
        expect(radio('ingredient.sauce')).toBeChecked();

        show({ visible: false });
        show({ visible: true, initialType: undefined, context: 'sauces' });
        expect(radio('ingredient.sauce')).toBeChecked();

        show({ visible: false });
        show({ visible: true, context: 'ingredients' });
        expect(radio('ingredient.fill')).toBeChecked();
    });

    it('sends nothing without a name', async () => {
        renderAdd();

        press('common.create');

        expect(await within(dialog()).findByText('ingredient.nameRequired')).toBeInTheDocument();
        expect(created()).toBeUndefined();
    });

    it('asks for a category and sends nothing until one is picked', async () => {
        renderAdd();
        typeName('Corn');

        fireEvent.click(chip('vegetarian'));

        expect(within(dialog()).getByText('ingredient.categoryRequired')).toBeInTheDocument();
        expect(button('common.create')).toBeDisabled();
        press('common.create');
        expect(created()).toBeUndefined();

        fireEvent.click(chip('vegan'));

        expect(within(dialog()).queryByText('ingredient.categoryRequired')).not.toBeInTheDocument();
        press('common.create');
        await waitFor(() => expect(created()).toBeDefined());
        expect(created()?.body).toMatchObject({ meat: false, vegetarian: false, vegan: true, fish: false });
    });

    it('stays open when creating fails', async () => {
        fake.on('POST', '/ingredients', () => {
            throw Object.assign(new Error('Request failed with status code 400'), { status: 400 });
        });
        renderAdd();

        typeName('Corn');
        press('common.create');

        expect(await screen.findByText('ingredient.addFailed')).toBeInTheDocument();
        expect(nameField()).toHaveValue('Corn');
        expect(onCancel).not.toHaveBeenCalled();
    });

    it('starts over when reopened after a cancel', async () => {
        renderAdd();
        fillInAndCancel();

        show({ visible: true });

        expect(nameField()).toHaveValue('');
        expect(radio('ingredient.fill')).toBeChecked();
        expect(slider()).toHaveAttribute('aria-valuenow', '0');
        typeName('Leek');
        press('common.create');
        await waitFor(() => expect(created()).toBeDefined());
        expect(created()?.body).toEqual({ ...nothingTicked, name: 'Leek', type: IngredientType.FILL, spicy: 0, vegetarian: true });
    });

    it('starts over when reopened after creating', async () => {
        renderAdd();
        typeName('Corn');
        fireEvent.click(chip('meat'));
        spiceUp();
        press('common.create');
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

        show({ visible: true });

        expect(nameField()).toHaveValue('');
        expect(slider()).toHaveAttribute('aria-valuenow', '0');
        press('common.create');
        expect(await within(dialog()).findByText('ingredient.nameRequired')).toBeInTheDocument();
        typeName('Leek');
        press('common.create');
        await waitFor(() => expect(created()?.body).toMatchObject({ name: 'Leek' }));
        expect(created()?.body).toMatchObject({ meat: false, vegetarian: true, spicy: 0 });
    });
});

describe('editing', () => {
    it('starts from the ingredient and saves the changes', async () => {
        renderEdit(pork);

        expect(within(dialog()).getByText('ingredient.editIngredient')).toBeInTheDocument();
        expect(nameField()).toHaveValue(pork.name);
        expect(radio('ingredient.fill')).toBeChecked();
        expect(slider()).toHaveAttribute('aria-valuenow', String(pork.spicy));
        typeName('Bacon');
        fireEvent.click(chip('histamine'));
        press('common.save');

        await waitFor(() => expect(onSave).toHaveBeenCalled());
        expect(onSave).toHaveBeenCalledWith(pork.id, { ...bodyOf(pork), name: 'Bacon', histamine: true });
        expect(await screen.findByText('ingredient.updated')).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('starts over from the ingredient when reopened', async () => {
        renderEdit(pork);
        fillInAndCancel();

        show({ visible: true });

        expect(nameField()).toHaveValue(pork.name);
        expect(radio('ingredient.fill')).toBeChecked();
        expect(slider()).toHaveAttribute('aria-valuenow', String(pork.spicy));
        press('common.save');
        await waitFor(() => expect(onSave).toHaveBeenCalled());
        expect(onSave).toHaveBeenCalledWith(pork.id, bodyOf(pork));
    });

    it('starts from the other ingredient when switched to it while open', async () => {
        renderEdit(pork);
        typeName('Bacon');
        fireEvent.click(chip('gluten'));

        show({ ingredient: aioli });

        expect(nameField()).toHaveValue(aioli.name);
        expect(radio('ingredient.sauce')).toBeChecked();
        expect(slider()).toHaveAttribute('aria-valuenow', String(aioli.spicy));
        press('common.save');
        await waitFor(() => expect(onSave).toHaveBeenCalled());
        expect(onSave).toHaveBeenCalledWith(aioli.id, bodyOf(aioli));
    });

    it('starts from the other ingredient when closed and opened on it', async () => {
        renderEdit(pork);
        fillInAndCancel();

        show({ visible: true, ingredient: aioli });

        expect(nameField()).toHaveValue(aioli.name);
        press('common.save');
        await waitFor(() => expect(onSave).toHaveBeenCalled());
        expect(onSave).toHaveBeenCalledWith(aioli.id, bodyOf(aioli));
    });

    it('opens empty for adding after an edit', async () => {
        renderEdit(pork);
        press('common.cancel');

        show({ visible: true, mode: 'add', ingredient: null, onSuccess, initialType: IngredientType.FILL });

        expect(within(dialog()).getByText('ingredient.addIngredient')).toBeInTheDocument();
        expect(nameField()).toHaveValue('');
        expect(slider()).toHaveAttribute('aria-valuenow', '0');
        typeName('Corn');
        press('common.create');
        await waitFor(() => expect(created()).toBeDefined());
        expect(created()?.body).toEqual({ ...nothingTicked, name: 'Corn', type: IngredientType.FILL, spicy: 0, vegetarian: true });
        expect(onSave).not.toHaveBeenCalled();
    });

    it('stays open when saving fails', async () => {
        onSave.mockRejectedValue(new Error('Request failed with status code 404'));
        renderEdit(pork);

        press('common.save');

        expect(await screen.findByText('ingredient.updateFailed')).toBeInTheDocument();
        expect(onCancel).not.toHaveBeenCalled();
    });
});
