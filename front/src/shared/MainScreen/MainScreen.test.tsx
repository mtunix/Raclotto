import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { type RouteObject } from 'react-router';
import { useAppStore } from '../../AppSlice';
import { useAuthStore } from '../../AuthSlice';
import type { SessionDto } from '../../api/generated/model';
import { events, ingredientsForUser, me, session } from '../../lib/api/__fixtures__/backendResponses';
import { FakeTransport } from '../../lib/api/fakeTransport';
import { setTransport, type Transport } from '../../lib/api/transport';
import { currentPath, renderRoutes, settle } from '../../testUtils';
import { MainScreen } from './MainScreen';

let fake: FakeTransport;
let previous: Transport;
let pendingEvents = events;

beforeEach(() => {
    pendingEvents = events;
    fake = new FakeTransport()
        .on('GET', '/ingredients', ingredientsForUser)
        .on('GET', '/events', () => pendingEvents);
    previous = setTransport(fake);
    useAuthStore.setState({ user: null });
});

afterEach(() => {
    setTransport(previous);
    vi.useRealTimers();
});

const routes: RouteObject[] = [{
    path: '/:sessionId',
    element: <MainScreen />,
    children: [
        { index: true, element: <p>home</p> },
        { path: 'history', element: <p>pans</p> },
    ],
}];

// Events are invalidated through SWR's global cache, so every test gets a session key of its own.
let sessions = 0;
function inSession(): SessionDto {
    sessions += 1;
    const current = { ...session, key: `main-screen-${sessions}` };
    useAppStore.setState({ session: current });
    return current;
}

it('waits for the session the layout is loading', () => {
    useAppStore.setState({ session: null });
    renderRoutes(routes, `/${session.id}`, { sharedCache: true });

    expect(screen.getByText('session.loading')).toBeInTheDocument();
    expect(fake.requests).toEqual([]);
});

it("shows the session's toolbar and loads its ingredients and events", async () => {
    const current = inSession();
    renderRoutes(routes, `/${current.id}`, { sharedCache: true });

    expect(screen.getAllByText(current.name).length).toBeGreaterThan(0);
    expect(screen.getByText('home')).toBeInTheDocument();
    expect(await screen.findByText('events.types.pan_swap.message')).toBeInTheDocument();
    expect(fake.last('GET', '/ingredients')?.query).toEqual({ session_key: current.key });
    expect(fake.last('GET', '/events')?.query).toEqual({ session_key: current.key });
});

it('frames a view in a card titled after its route', async () => {
    const current = inSession();
    renderRoutes(routes, `/${current.id}/history`, { sharedCache: true });

    expect(screen.getByText('toolbar.historyTitle')).toBeInTheDocument();
    expect(screen.getByText('pans')).toBeInTheDocument();
    await settle();
});

it('dismisses the newest event and refetches the rest', async () => {
    const current = inSession();
    fake.on('POST', `/events/${events[0].id}/dismiss`, () => {
        pendingEvents = [];
        return undefined;
    });
    renderRoutes(routes, `/${current.id}`, { sharedCache: true });

    fireEvent.click(await screen.findByText('events.dismiss'));

    await waitFor(() => expect(screen.queryByText('events.types.pan_swap.message')).not.toBeInTheDocument());
    expect(fake.last('POST', `/events/${events[0].id}/dismiss`)).toBeDefined();
});

it('leaves for the start screen when the URL names another session', async () => {
    vi.useFakeTimers();
    inSession();
    renderRoutes(routes, '/999', { sharedCache: true });

    await act(() => vi.advanceTimersByTimeAsync(500));

    expect(currentPath()).toBe('/');
});

it('reminds a guest to keep their account and leads to the settings', async () => {
    useAuthStore.setState({ user: { ...me, is_guest: true } });
    const current = inSession();
    const { router } = renderRoutes(routes, `/${current.id}`, { sharedCache: true });

    expect(screen.getByText('guest.notice')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'guest.keepAccountButton' }));

    await waitFor(() => expect(router.state.location.pathname).toBe(`/${current.id}/settings`));
});

it('reminds no one with an account', async () => {
    useAuthStore.setState({ user: me });
    const current = inSession();
    renderRoutes(routes, `/${current.id}`, { sharedCache: true });

    expect(screen.queryByText('guest.notice')).not.toBeInTheDocument();
    await settle();
});
