import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useAppStore } from '../../AppSlice';
import { useAuthStore } from '../../AuthSlice';
import type { SessionDto } from '../../api/generated/model';
import {
    grantedAdmin,
    ingredientExport,
    ingredientImport,
    invite,
    me,
    session,
    users,
} from '../../lib/api/__fixtures__/backendResponses';
import { FakeTransport } from '../../lib/api/fakeTransport';
import { setTransport, type Transport } from '../../lib/api/transport';
import { currentPath, renderRoutes } from '../../testUtils';
import { SettingsView } from './SettingsView';

let fake: FakeTransport;
let previous: Transport;
let invites = [invite];
const writeText = vi.fn((_text: string) => Promise.resolve());

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

    it('ends the session once confirmed and shows its recap', async () => {
        fake.on('POST', '/sessions/close', { ...session, active: false });
        await renderSettings();
        await openTab('settings.sessionSettings');

        fireEvent.click(screen.getByText('session.endSession'));
        const dialog = await screen.findByRole('dialog');
        fireEvent.click(button('session.endSession', dialog));

        await waitFor(() => expect(currentPath()).toBe(`/recap/${session.key}`));
        expect(fake.last('POST', '/sessions/close')?.body).toEqual({ key: session.key });
        expect(useAppStore.getState().session).toBeNull();
    });

    it("leaves renaming and ending to the session's creator", async () => {
        useAuthStore.setState({ user: { ...me, id: me.id + 1 } });
        await renderSettings();
        await openTab('settings.sessionSettings');
        const panel = screen.getByRole('tabpanel');

        expect(await within(panel).findByText('settings.onlyCreatorManages')).toBeInTheDocument();
        expect(within(panel).getByPlaceholderText('common.enterName')).toBeDisabled();
        expect(within(panel).queryByText('session.endSession')).not.toBeInTheDocument();
        expect(button('settings.export', panel)).toBeEnabled();
    });

    it('lets an admin end any session', async () => {
        useAuthStore.setState({ user: { ...me, id: me.id + 1, is_admin: true } });
        await renderSettings();
        await openTab('settings.sessionSettings');

        expect(await within(screen.getByRole('tabpanel')).findByText('session.endSession')).toBeInTheDocument();
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

describe('password', () => {
    const passwordForm = () => screen.getByLabelText('settings.currentPassword').closest('form') as HTMLElement;

    async function fillPasswords(current: string, next: string, confirm = next) {
        await renderSettings();
        fireEvent.change(screen.getByLabelText('settings.currentPassword'), { target: { value: current } });
        fireEvent.change(screen.getByLabelText('settings.newPassword'), { target: { value: next } });
        fireEvent.change(screen.getByLabelText('auth.confirmPassword'), { target: { value: confirm } });
        await act(async () => {
            fireEvent.click(button('settings.changePassword', passwordForm()));
        });
    }

    it('changes the password and keeps this device signed in with the new token', async () => {
        fake.on('POST', '/auth/password', { token: 'new-token' });

        await fillPasswords('old-secret', 'new-secret');

        await waitFor(() => expect(useAuthStore.getState().token).toBe('new-token'));
        expect(fake.last('POST', '/auth/password')?.body).toEqual({ current_password: 'old-secret', new_password: 'new-secret' });
    });

    it('says when the current password is wrong', async () => {
        fake.on('POST', '/auth/password', () => {
            throw Object.assign(new Error('Bad Request'), { status: 400 });
        });

        await fillPasswords('wrong', 'new-secret');

        expect(await screen.findByText('settings.wrongPassword')).toBeInTheDocument();
    });

    it('sends nothing while the new password is too short or not repeated', async () => {
        await fillPasswords('old-secret', 'short');
        expect(await screen.findByText('auth.passwordTooShort')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('settings.newPassword'), { target: { value: 'long-enough' } });
        fireEvent.change(screen.getByLabelText('auth.confirmPassword'), { target: { value: 'different' } });
        await act(async () => {
            fireEvent.click(button('settings.changePassword', passwordForm()));
        });
        expect(await screen.findByText('auth.passwordsDoNotMatch')).toBeInTheDocument();

        expect(fake.last('POST', '/auth/password')).toBeUndefined();
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

describe('admins', () => {
    const [, ben, , dora] = users;

    beforeEach(() => {
        useAuthStore.setState({ user: { ...me, is_admin: true } });
        fake.on('GET', '/users', users);
    });

    const adminSwitch = (name: string) => screen.getByRole('switch', { name });

    it('is a tab for admins only', async () => {
        useAuthStore.setState({ user: me });
        await renderSettings();

        expect(screen.queryByText('settings.admins')).not.toBeInTheDocument();
        expect(fake.last('GET', '/users')).toBeUndefined();
    });

    it("lists every user with their rights and leaves the admin's own to another admin", async () => {
        await renderSettings();
        await openTab('settings.admins');

        await waitFor(() => expect(adminSwitch(dora.name)).toBeChecked());
        expect(adminSwitch(ben.name)).not.toBeChecked();
        expect(adminSwitch(ben.name)).toBeEnabled();
        expect(adminSwitch(me.name)).toBeDisabled();
        expect(screen.getByText('settings.ownAdminLocked')).toBeInTheDocument();
    });

    it('grants admin to a user', async () => {
        fake.on('PATCH', `/users/${ben.id}`, grantedAdmin);
        await renderSettings();
        await openTab('settings.admins');

        await act(async () => {
            fireEvent.click(await screen.findByRole('switch', { name: ben.name }));
        });

        await waitFor(() => expect(adminSwitch(ben.name)).toBeChecked());
        expect(fake.last('PATCH', `/users/${ben.id}`)?.body).toEqual({ is_admin: true });
    });

    it('revokes an admin and keeps the switch when the backend refuses', async () => {
        fake.on('PATCH', `/users/${dora.id}`, () => {
            throw Object.assign(new Error('Forbidden'), { status: 403 });
        });
        await renderSettings();
        await openTab('settings.admins');

        await act(async () => {
            fireEvent.click(await screen.findByRole('switch', { name: dora.name }));
        });

        expect(fake.last('PATCH', `/users/${dora.id}`)?.body).toEqual({ is_admin: false });
        expect(await screen.findByText('settings.adminChangeFailed')).toBeInTheDocument();
        expect(adminSwitch(dora.name)).toBeChecked();
    });
});
