import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { type RouteObject } from 'react-router';
import { useAppStore } from '../../AppSlice';
import { useAuthStore } from '../../AuthSlice';
import type { SessionDto } from '../../api/generated/model';
import { events, ingredientsForUser, session } from '../../lib/api/__fixtures__/backendResponses';
import { FakeTransport } from '../../lib/api/fakeTransport';
import { setTransport, type Transport } from '../../lib/api/transport';
import { currentPath, renderRoutes } from '../../testUtils';
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
    expect(await screen.findByText(events[0].message)).toBeInTheDocument();
    expect(fake.last('GET', '/ingredients')?.query).toEqual({ session_key: current.key });
    expect(fake.last('GET', '/events')?.query).toEqual({ session_key: current.key });
});

it('frames a view in a card titled after its route', () => {
    const current = inSession();
    renderRoutes(routes, `/${current.id}/history`, { sharedCache: true });

    expect(screen.getByText('toolbar.historyTitle')).toBeInTheDocument();
    expect(screen.getByText('pans')).toBeInTheDocument();
});

it('dismisses the newest event and refetches the rest', async () => {
    const current = inSession();
    fake.on('POST', `/events/${events[0].id}/dismiss`, () => {
        pendingEvents = [];
        return undefined;
    });
    renderRoutes(routes, `/${current.id}`, { sharedCache: true });

    fireEvent.click(await screen.findByText('Dismiss'));

    await waitFor(() => expect(screen.queryByText(events[0].message)).not.toBeInTheDocument());
    expect(fake.last('POST', `/events/${events[0].id}/dismiss`)).toBeDefined();
});

it('leaves for the start screen when the URL names another session', async () => {
    vi.useFakeTimers();
    inSession();
    renderRoutes(routes, '/999', { sharedCache: true });

    await act(() => vi.advanceTimersByTimeAsync(500));

    expect(currentPath()).toBe('/');
});
