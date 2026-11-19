import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { useAppStore } from '../../AppSlice';
import { useAuthStore } from '../../AuthSlice';
import type { SessionDto } from '../../api/generated/model';
import { me, session, sessions } from '../../lib/api/__fixtures__/backendResponses';
import { FakeTransport } from '../../lib/api/fakeTransport';
import { setTransport, Transport } from '../../lib/api/transport';
import { currentPath, renderRoute } from '../../testUtils';
import { JoinSession, SessionSelector, StartScreen } from './StartScreen';

jest.mock('i18next', () => ({
    t: (key: string) => key,
}));

let fake: FakeTransport;
let previous: Transport;

const inactive: SessionDto = { ...session, id: 2, key: 's2', name: 'Last year', active: false };

beforeEach(() => {
    fake = new FakeTransport().on('GET', '/sessions', sessions);
    previous = setTransport(fake);
    useAppStore.setState({ session: null });
    useAuthStore.setState({ user: me });
});

afterEach(() => {
    setTransport(previous);
});

async function choose(optionText: string) {
    fireEvent.mouseDown(screen.getByRole('combobox'));
    const options = await screen.findAllByText(optionText);
    fireEvent.click(options[options.length - 1]);
}

describe('StartScreen', () => {
    it('greets the signed-in user and offers to create or join a session', async () => {
        renderRoute(<StartScreen />);

        expect(screen.getByText(`session.welcome ${me.name}`)).toBeInTheDocument();
        expect(screen.getByText('session.createNew')).toBeInTheDocument();
        expect(await screen.findByText(session.name)).toBeInTheDocument();
    });

    it('goes straight to the session the user is already in', async () => {
        useAppStore.setState({ session });
        renderRoute(<StartScreen />);

        await waitFor(() => expect(currentPath()).toBe(`/${session.id}`));
    });

    it('signs out to the login page', async () => {
        renderRoute(<StartScreen />);

        fireEvent.click(screen.getByText('auth.logout'));

        await waitFor(() => expect(currentPath()).toBe('/login'));
        expect(useAuthStore.getState().user).toBeNull();
    });
});

describe('JoinSession', () => {
    it('shows a spinner while the sessions load', () => {
        fake.on('GET', '/sessions', () => new Promise(() => {}));
        renderRoute(<JoinSession />);

        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('shows the error page when the sessions fail to load', async () => {
        fake.on('GET', '/sessions', () => {
            throw Object.assign(new Error('gone'), { status: 404 });
        });
        renderRoute(<JoinSession />);

        expect(await screen.findByText('error.unknown.title')).toBeInTheDocument();
    });

    it('says so when there is no session to join', async () => {
        fake.on('GET', '/sessions', []);
        renderRoute(<JoinSession />);

        expect(await screen.findByText('session.noSessionsAvailable')).toBeInTheDocument();
    });

    it('asks for inactive sessions too, and lists active ones first', async () => {
        fake.on('GET', '/sessions', [inactive, session]);
        renderRoute(<JoinSession />);

        expect(await screen.findByText(session.name)).toBeInTheDocument();
        expect(fake.last('GET', '/sessions')?.query).toEqual({ include_inactive: true });
        expect(screen.getByText('session.join')).toBeInTheDocument();
    });

    it('joins the selected active session', async () => {
        renderRoute(<JoinSession />);
        await screen.findByText(session.name);

        fireEvent.click(screen.getByText('session.join'));

        await waitFor(() => expect(currentPath()).toBe(`/${session.id}/generate`));
        expect(useAppStore.getState().session).toEqual(session);
        expect(fake.last('POST', '/sessions/reactivate')).toBeUndefined();
    });

    it('reactivates an inactive session before joining it', async () => {
        fake.on('GET', '/sessions', [session, inactive])
            .on('POST', '/sessions/reactivate', { ...inactive, active: true });
        renderRoute(<JoinSession />);
        await screen.findByText(session.name);

        await choose(`${inactive.name} session.inactive`);
        expect(await screen.findByText('session.reactivateMessage')).toBeInTheDocument();
        await act(async () => {
            fireEvent.click(screen.getByText('session.joinAndReactivate'));
        });

        await waitFor(() => expect(currentPath()).toBe(`/${inactive.id}/generate`));
        expect(fake.last('POST', '/sessions/reactivate')?.body).toEqual({ key: inactive.key });
        expect(useAppStore.getState().session).toEqual({ ...inactive, active: true });
    });

    it("offers someone else's closed session only as a recap", async () => {
        fake.on('GET', '/sessions', [session, { ...inactive, created_by_user_id: me.id + 1 }]);
        renderRoute(<JoinSession />);
        await screen.findByText(session.name);

        await choose(`${inactive.name} session.inactive`);
        expect(await screen.findByText('session.closedMessage')).toBeInTheDocument();
        expect(screen.queryByText('session.joinAndReactivate')).not.toBeInTheDocument();
        fireEvent.click(screen.getByText('recap.show'));

        await waitFor(() => expect(currentPath()).toBe(`/recap/${inactive.key}`));
        expect(fake.last('POST', '/sessions/reactivate')).toBeUndefined();
    });
});

describe('SessionSelector', () => {
    it('creates nothing until the session has a name', async () => {
        renderRoute(<SessionSelector />);
        await screen.findByText(session.name);

        fireEvent.change(screen.getByPlaceholderText('session.sessionNamePlaceholder'), { target: { value: '   ' } });

        expect(screen.getByText('common.create').closest('button')).toBeDisabled();
    });

    it('creates a session under the trimmed name and opens it', async () => {
        const created: SessionDto = { ...session, id: 7, key: 'new', name: 'Friday' };
        fake.on('POST', '/sessions', created);
        renderRoute(<SessionSelector />);
        await screen.findByText(session.name);

        fireEvent.change(screen.getByPlaceholderText('session.sessionNamePlaceholder'), { target: { value: '  Friday ' } });
        fireEvent.click(screen.getByText('common.create'));

        await waitFor(() => expect(currentPath()).toBe(`/${created.id}`));
        expect(fake.last('POST', '/sessions')?.body).toEqual({ name: 'Friday' });
        expect(useAppStore.getState().session).toEqual(created);
    });
});
