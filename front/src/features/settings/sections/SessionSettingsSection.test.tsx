import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useAppStore } from '../../../AppSlice';
import { useAuthStore } from '../../../AuthSlice';
import type { SessionDto } from '../../../api/generated/model';
import { me, session } from '../../../lib/api/__fixtures__/backendResponses';
import { FakeTransport } from '../../../lib/api/fakeTransport';
import { setTransport, type Transport } from '../../../lib/api/transport';
import { currentPath, renderRoute } from '../../../testUtils';
import { INGREDIENT_PROMPT } from '../ingredientPrompt';
import { SessionSettingsSection } from './SessionSettingsSection';

let fake: FakeTransport;
let previous: Transport;
const writeText = vi.fn((_text: string) => Promise.resolve());
const other = { ...me, id: me.id + 1 };

beforeAll(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
});

beforeEach(() => {
    writeText.mockClear();
    fake = new FakeTransport().on('GET', '/sessions/by-key', session);
    previous = setTransport(fake);
    useAppStore.setState({ session });
    useAuthStore.setState({ user: me });
});

afterEach(() => {
    setTransport(previous);
});

const nameInput = () => screen.getByPlaceholderText('common.enterName');
const saveButton = () => screen.getByRole('button', { name: 'common.save' });
const endButton = () => screen.getByRole('button', { name: 'session.endSession' });

async function renderSection() {
    renderRoute(<SessionSettingsSection />);
    await waitFor(() => expect(nameInput()).toHaveValue(session.name));
}

it("loads the session by the current session's key", async () => {
    await renderSection();

    expect(fake.last('GET', '/sessions/by-key')?.query).toEqual({ session_key: session.key });
});

describe('the creator', () => {
    it('may save a new name only when it differs and is not blank', async () => {
        await renderSection();
        expect(saveButton()).toBeDisabled();

        fireEvent.change(nameInput(), { target: { value: '   ' } });
        expect(saveButton()).toBeDisabled();
        fireEvent.change(nameInput(), { target: { value: 'Friday' } });
        expect(saveButton()).toBeEnabled();
    });

    it('renames the session with the name trimmed, also by pressing enter', async () => {
        const renamed: SessionDto = { ...session, name: 'Friday' };
        fake.on('PATCH', `/sessions/${session.id}`, renamed);
        await renderSection();

        fireEvent.change(nameInput(), { target: { value: ' Friday ' } });
        fireEvent.keyDown(nameInput(), { key: 'Enter', code: 'Enter', keyCode: 13 });

        expect(await screen.findByText('common.saved')).toBeInTheDocument();
        expect(fake.last('PATCH', `/sessions/${session.id}`)?.body).toEqual({ name: 'Friday' });
        expect(useAppStore.getState().session).toEqual(renamed);
    });

    it('keeps the old name when renaming fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        fake.on('PATCH', `/sessions/${session.id}`, () => {
            throw Object.assign(new Error('Request failed with status code 500'), { status: 500 });
        });
        await renderSection();

        fireEvent.change(nameInput(), { target: { value: 'Friday' } });
        fireEvent.click(saveButton());

        expect(await screen.findByText('common.saveFailed')).toBeInTheDocument();
        expect(useAppStore.getState().session).toEqual(session);
        await waitFor(() => expect(saveButton()).toBeEnabled());
    });

    it('ends the session only once confirmed, then shows its recap', async () => {
        fake.on('POST', '/sessions/close', { ...session, active: false });
        await renderSection();

        fireEvent.click(endButton());
        const dialog = await screen.findByRole('dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'common.cancel' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(fake.last('POST', '/sessions/close')).toBeUndefined();

        fireEvent.click(endButton());
        fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'session.endSession' }));

        await waitFor(() => expect(currentPath()).toBe(`/recap/${session.key}`));
        expect(fake.last('POST', '/sessions/close')?.body).toEqual({ key: session.key });
        expect(useAppStore.getState().session).toBeNull();
    });

    it('stays in the session when ending it fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        fake.on('POST', '/sessions/close', () => {
            throw Object.assign(new Error('Request failed with status code 500'), { status: 500 });
        });
        await renderSection();

        fireEvent.click(endButton());
        fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'session.endSession' }));

        expect(await screen.findByText('session.closeFailed')).toBeInTheDocument();
        expect(useAppStore.getState().session).toEqual(session);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
});

describe('anyone but the creator', () => {
    beforeEach(() => {
        useAuthStore.setState({ user: other });
    });

    it('sees the session read-only, without renaming or ending it', async () => {
        await renderSection();

        expect(screen.getByText('settings.onlyCreatorManages')).toBeInTheDocument();
        expect(nameInput()).toBeDisabled();
        expect(screen.queryByRole('button', { name: 'common.save' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'session.endSession' })).not.toBeInTheDocument();
    });

    it('still shows the recap and exports and imports ingredients', async () => {
        await renderSection();

        expect(screen.getByRole('button', { name: /settings.export/ })).toBeEnabled();
        expect(screen.getByRole('button', { name: /settings.import/ })).toBeEnabled();
        fireEvent.click(screen.getByRole('button', { name: /recap.show/ }));

        expect(currentPath()).toBe(`/recap/${session.key}`);
    });

    it('may manage the session as an admin', async () => {
        useAuthStore.setState({ user: { ...other, is_admin: true } });
        await renderSection();

        expect(screen.queryByText('settings.onlyCreatorManages')).not.toBeInTheDocument();
        expect(nameInput()).toBeEnabled();
        expect(endButton()).toBeInTheDocument();
    });
});

it('goes by who created the session as the backend has it', async () => {
    useAppStore.setState({ session: { ...session, created_by_user_id: other.id } });
    await renderSection();

    expect(screen.queryByText('settings.onlyCreatorManages')).not.toBeInTheDocument();
    expect(endButton()).toBeInTheDocument();
});

it('shows the prompt for generating ingredients and copies it', async () => {
    await renderSection();

    fireEvent.click(screen.getByRole('button', { name: /settings.viewPrompt/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('textbox')).toHaveValue(INGREDIENT_PROMPT);
    fireEvent.click(within(dialog).getByRole('button', { name: /settings.copyPrompt/ }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(INGREDIENT_PROMPT));
    expect(await screen.findByText('settings.copiedToClipboard')).toBeInTheDocument();
});

it('shows a spinner while the session loads', () => {
    fake.on('GET', '/sessions/by-key', () => new Promise(() => {}));
    renderRoute(<SessionSettingsSection />);

    expect(screen.queryByPlaceholderText('common.enterName')).not.toBeInTheDocument();
    expect(document.querySelector('.ant-spin')).toBeInTheDocument();
});
