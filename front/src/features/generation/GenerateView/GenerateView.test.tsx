import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useAppStore } from '../../../AppSlice';
import { useAuthStore } from '../../../AuthSlice';
import type { RollOutcomeDto } from '../../../api/generated/model';
import {
    availableCounts,
    ingredientsForUser,
    me,
    prepTypes,
    rating,
    rollOutcome,
    session,
} from '../../../lib/api/__fixtures__/backendResponses';
import { FakeTransport } from '../../../lib/api/fakeTransport';
import { setTransport, Transport } from '../../../lib/api/transport';
import { renderRoute } from '../../../testUtils';
import { GenerateView } from './GenerateView';
import { useIngredientStore } from './ingredientStore';

const pan = rollOutcome.pan;
const noLevelUp: RollOutcomeDto = { ...rollOutcome, reward: { ...rollOutcome.reward, leveled_up: false } };

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
    localStorage.clear();
    useIngredientStore.setState({ ingredientCount: 0, sauceCount: 0 });
    fake = new FakeTransport()
        .on('GET', '/ingredients', ingredientsForUser)
        .on('GET', '/preparation_type', prepTypes)
        .on('GET', '/ingredients/available-counts', availableCounts)
        .on('POST', '/pans/generate', noLevelUp);
    previous = setTransport(fake);
    useAppStore.setState({ session });
    useAuthStore.setState({ user: me });
});

afterEach(() => {
    setTransport(previous);
    jest.useRealTimers();
    jest.restoreAllMocks();
});

const generateButton = () => screen.getByText('generate.generateButton').closest('button') as HTMLElement;
const countInputs = () => screen.getAllByRole('spinbutton') as HTMLInputElement[];

async function renderView() {
    const result = renderRoute(<GenerateView />);
    await screen.findByText(`Available: ${availableCounts.fill_count} / ${availableCounts.total_fill_count}`);
    return result;
}

/** Clicks generate and lets the roll animation run out. */
async function generate() {
    jest.useFakeTimers();
    fireEvent.click(generateButton());
    await act(async () => {
        await jest.advanceTimersByTimeAsync(15000);
    });
    jest.useRealTimers();
}

it('shows how many fills and sauces are available in the session', async () => {
    await renderView();

    expect(screen.getByText(`Available: ${availableCounts.sauce_count} / ${availableCounts.total_sauce_count}`)).toBeInTheDocument();
    expect(fake.last('GET', '/ingredients/available-counts')?.query).toEqual({ session_key: session.key });
});

it('starts from the counts of the last roll', async () => {
    localStorage.setItem('numFill', '2');
    await renderView();

    expect(countInputs()[0]).toHaveValue('2');
});

it('generates only once something is asked for', async () => {
    await renderView();
    expect(generateButton()).toBeDisabled();

    fireEvent.click(screen.getAllByText('+')[0]);

    expect(countInputs()[0]).toHaveValue('1');
    expect(generateButton()).toBeEnabled();
});

it('rolls a pan with the chosen counts, shows it and applies the reward', async () => {
    localStorage.setItem('numFill', '2');
    await renderView();

    await generate();

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(pan.name as string)).toBeInTheDocument();
    expect(fake.last('POST', '/pans/generate')?.query).toEqual({ session_key: session.key });
    expect(fake.last('POST', '/pans/generate')?.body).toEqual({ num_fill: 2, num_sauce: 0, roll_cheese: false });
    expect(useAuthStore.getState().user?.experience_points).toBe(rollOutcome.reward.xp_after);
    expect(localStorage.getItem('numFill')).toBe('2');
});

it('rolls a preparation type and cheese level when asked to', async () => {
    localStorage.setItem('numFill', '1');
    await renderView();

    fireEvent.click(screen.getByText('generate.rollPreparationType'));
    fireEvent.click(screen.getByText('generate.rollCheese'));
    await generate();

    await screen.findByRole('dialog');
    expect(fake.last('POST', '/pans/generate')?.body).toEqual({
        num_fill: 1,
        num_sauce: 0,
        preparation_type_id: prepTypes[0].id,
        roll_cheese: true,
    });
});

it('rates the rolled pan and returns to the controls on close', async () => {
    fake.on('POST', '/ratings', rating).on('GET', `/pans/${pan.id}`, pan);
    localStorage.setItem('numFill', '1');
    await renderView();
    await generate();
    const dialog = await screen.findByRole('dialog');

    const fourthStar = within(dialog).getAllByRole('radio')[3];
    fireEvent.click(fourthStar.querySelector('.ant-rate-star-second') as HTMLElement);
    await waitFor(() => expect(fake.last('POST', '/ratings')?.body).toEqual({ pan_id: pan.id, rating: 4 }));
    fireEvent.click(within(dialog).getByText('common.close'));

    expect(await screen.findByText('generate.generateButton')).toBeInTheDocument();
});

it('returns to the controls when the roll fails', async () => {
    fake.on('POST', '/pans/generate', () => {
        throw new Error('no ingredients left');
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('numFill', '1');
    await renderView();

    await generate();

    expect(screen.getByText('generate.generateButton')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useAuthStore.getState().user).toEqual(me);
});
