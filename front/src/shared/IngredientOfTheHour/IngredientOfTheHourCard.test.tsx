import { fireEvent, screen, waitFor } from '@testing-library/react';
import { useAuthStore } from '../../AuthSlice';
import { ingredientOfTheHour, me } from '../../lib/api/__fixtures__/backendResponses';
import { FakeTransport } from '../../lib/api/fakeTransport';
import { setTransport, type Transport } from '../../lib/api/transport';
import { renderRoute } from '../../testUtils';
import { IngredientOfTheHourCard } from './IngredientOfTheHourCard';

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
    fake = new FakeTransport()
        .on('GET', '/events/ingredient-of-the-hour', ingredientOfTheHour)
        .on('PATCH', '/auth/me', { ...me, add_ingredient_of_the_hour: true })
        .on('GET', '/auth/me', me);
    previous = setTransport(fake);
    useAuthStore.setState({ user: me });
});

afterEach(() => {
    setTransport(previous);
});

const name = ingredientOfTheHour.ingredient?.name ?? '';

it("shows the session's ingredient of the hour and its bonus", async () => {
    renderRoute(<IngredientOfTheHourCard sessionKey="s1" />);

    expect(await screen.findByText(name)).toBeInTheDocument();
    expect(screen.getByText(`+${ingredientOfTheHour.bonus_xp} XP`)).toBeInTheDocument();
    expect(fake.last('GET', '/events/ingredient-of-the-hour')?.query).toEqual({ session_key: 's1' });
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
});

it('says when the diet does not allow it, and when there is none yet', async () => {
    const forbidden = { ...ingredientOfTheHour, ingredient: { ...ingredientOfTheHour.ingredient!, applicable: false } };
    fake.on('GET', '/events/ingredient-of-the-hour', forbidden);
    const { unmount } = renderRoute(<IngredientOfTheHourCard sessionKey="s1" />);
    expect(await screen.findByText('ingredient.nonApplicable')).toBeInTheDocument();
    unmount();

    fake.on('GET', '/events/ingredient-of-the-hour', { ...ingredientOfTheHour, ingredient: null, chosen_at: null });
    renderRoute(<IngredientOfTheHourCard sessionKey="s1" />);
    expect(await screen.findByText('ingredientOfTheHour.none')).toBeInTheDocument();
});

it('lets the user opt in to always getting it, saved on their profile', async () => {
    renderRoute(<IngredientOfTheHourCard sessionKey="s1" optIn />);

    const toggle = await screen.findByRole('switch', { name: 'ingredientOfTheHour.alwaysAdd' });
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);

    await waitFor(() => expect(fake.last('PATCH', '/auth/me')?.body).toEqual({ add_ingredient_of_the_hour: true }));
    await waitFor(() => expect(toggle).toBeChecked());
    expect(useAuthStore.getState().user?.add_ingredient_of_the_hour).toBe(true);
});
