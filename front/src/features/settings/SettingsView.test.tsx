import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useAppStore } from '../../AppSlice';
import { useAuthStore } from '../../AuthSlice';
import type { SessionDto } from '../../api/generated/model';
import {
    ingredientExport,
    ingredientImport,
    invite,
    me,
    session,
} from '../../lib/api/__fixtures__/backendResponses';
import { FakeTransport } from '../../lib/api/fakeTransport';
import { setTransport, Transport } from '../../lib/api/transport';
import { currentPath, renderRoutes } from '../../testUtils';
import { SettingsView } from './SettingsView';

let fake: FakeTransport;
let previous: Transport;
let invites = [invite];
const writeText = jest.fn((_text: string) => Promise.resolve());

beforeAll(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
});

beforeEach(() => {
    invites = [invite];
    writeText.mockClear();
    fake = new FakeTransport()
        .on('GET', '/auth/me', me)
        .on('GET', '/sessions/by-key', session)
        .on('GET', '/invites', () => invites);
    previous = setTransport(fake);
    useAppStore.setState({ session });
    useAuthStore.setState({ user: me });
});

afterEach(() => {
    setTransport(previous);
});

const button = (label: string, scope: HTMLElement = document.body) =>
    within(scope).getAllByText(label).map((node) => node.closest('button')).find(Boolean) as HTMLElement;

async function renderSettings() {
    const result = renderRoutes([{ path: '/:sessionId/settings', element: <SettingsView /> }], `/${session.id}/settings`);
    await waitFor(() => expect(screen.getByPlaceholderText('common.enterName')).toHaveValue(me.name));
    return result;
}

async function openTab(label: string) {
    fireEvent.click(screen.getByText(label));
    await waitFor(() => expect(screen.getByText(label).closest('.ant-tabs-tab')).toHaveClass('ant-tabs-tab-active'));
}

describe('user settings', () => {
    it("loads the signed-in user's settings and saves nothing until one changes", async () => {
        await renderSettings();

        expect(button('common.save')).toBeDisabled();
        expect(screen.getByText('tags.meat')).toBeInTheDocument();
    });

    it('saves the changed name and diet, and signs the user in as the result', async () => {
        const saved = { ...me, name: 'Grace', meat: false };
        fake.on('PATCH', '/auth/me', saved);
        await renderSettings();

        fireEvent.change(screen.getByPlaceholderText('common.enterName'), { target: { value: 'Grace' } });
        fireEvent.click(screen.getByText('tags.meat'));
        await act(async () => {
            fireEvent.click(button('common.save'));
        });

        await waitFor(() => expect(useAuthStore.getState().user).toEqual(saved));
        expect(fake.last('PATCH', '/auth/me')?.body).toMatchObject({
            name: 'Grace',
            meat: false,
            vegetarian: true,
            vegan: true,
            fish: me.fish,
            gluten: me.gluten,
            language: me.language,
        });
        await waitFor(() => expect(button('common.save')).toBeDisabled());
    });

    it('keeps the diet hierarchy: vegetarian food stays allowed while meat is', async () => {
        fake.on('PATCH', '/auth/me', me);
        await renderSettings();

        fireEvent.click(screen.getByText('tags.vegetarian'));
        expect(button('common.save')).toBeDisabled();
        fireEvent.click(screen.getByText('tags.meat'));
        fireEvent.click(screen.getByText('tags.vegetarian'));
        await act(async () => {
            fireEvent.click(button('common.save'));
        });

        await waitFor(() => expect(fake.last('PATCH', '/auth/me')).toBeDefined());
        expect(fake.last('PATCH', '/auth/me')?.body).toMatchObject({ meat: false, vegetarian: false, vegan: true });
    });
});

describe('session settings', () => {
    it('renames the session', async () => {
        const renamed: SessionDto = { ...session, name: 'Friday' };
        fake.on('PATCH', `/sessions/${session.id}`, renamed);
        await renderSettings();
        await openTab('settings.sessionSettings');
        const panel = screen.getByRole('tabpanel');

        const name = within(panel).getByPlaceholderText('common.enterName');
        await waitFor(() => expect(name).toHaveValue(session.name));
        fireEvent.change(name, { target: { value: ' Friday ' } });
        fireEvent.click(button('common.save', panel));

        await waitFor(() => expect(useAppStore.getState().session).toEqual(renamed));
        expect(fake.last('PATCH', `/sessions/${session.id}`)?.body).toEqual({ name: 'Friday' });
    });

    it('ends the session once confirmed and returns to the start screen', async () => {
        fake.on('POST', '/sessions/close', { ...session, active: false });
        await renderSettings();
        await openTab('settings.sessionSettings');

        fireEvent.click(screen.getByText('session.endSession'));
        const dialog = await screen.findByRole('dialog');
        fireEvent.click(button('session.endSession', dialog));

        await waitFor(() => expect(currentPath()).toBe('/'));
        expect(fake.last('POST', '/sessions/close')?.body).toEqual({ key: session.key });
        expect(useAppStore.getState().session).toBeNull();
    });

    it("exports the session's ingredients and copies them", async () => {
        fake.on('GET', '/ingredients/export', ingredientExport);
        await renderSettings();
        await openTab('settings.sessionSettings');

        await act(async () => {
            fireEvent.click(button('settings.export', screen.getByRole('tabpanel')));
        });

        const json = JSON.stringify(ingredientExport, null, 2);
        await waitFor(() => expect(writeText).toHaveBeenCalledWith(json));
        expect(fake.last('GET', '/ingredients/export')?.query).toEqual({ session_key: session.key });
        expect(within(await screen.findByRole('dialog')).getByRole('textbox')).toHaveValue(json);
    });

    it('imports pasted ingredients after staging them', async () => {
        fake.on('POST', '/ingredients/import', ingredientImport)
            .on('GET', '/ingredients', [])
            .on('GET', '/ingredients/available-counts', {});
        await renderSettings();
        await openTab('settings.sessionSettings');

        fireEvent.click(button('settings.import', screen.getByRole('tabpanel')));
        const dialog = await screen.findByRole('dialog');
        fireEvent.change(within(dialog).getByPlaceholderText('settings.pasteJsonHere'), {
            target: { value: JSON.stringify(ingredientExport) },
        });
        expect(within(dialog).getAllByPlaceholderText('ingredient.ingredientName')).toHaveLength(ingredientExport.ingredients.length);
        await act(async () => {
            fireEvent.click(button('settings.import', dialog));
        });

        await waitFor(() => expect(fake.last('POST', '/ingredients/import')).toBeDefined());
        const request = fake.last('POST', '/ingredients/import');
        expect(request?.query).toEqual({ session_key: session.key });
        expect((request?.body as { ingredients: { name: string }[] }).ingredients.map((i) => i.name))
            .toEqual(ingredientExport.ingredients.map((i) => i.name));
    });
});

describe('invites', () => {
    it("lists the user's invites and creates one for an email address", async () => {
        const created = { ...invite, id: 2, email: 'dora@example.com', token: 'new-token' };
        fake.on('POST', '/invites', () => {
            invites = [created, invite];
            return created;
        });
        await renderSettings();
        await openTab('common.invites');

        expect(await screen.findByText(invite.token)).toBeInTheDocument();
        fireEvent.change(screen.getByPlaceholderText('invite.emailPlaceholder'), { target: { value: created.email } });
        await act(async () => {
            fireEvent.click(button('invite.generate'));
        });

        expect(await screen.findByText(created.token)).toBeInTheDocument();
        expect(fake.last('POST', '/invites')?.body).toEqual({ email: created.email });
    });
});
