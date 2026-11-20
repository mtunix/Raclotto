import { screen, waitFor } from '@testing-library/react';
import { useAuthStore } from '../../../AuthSlice';
import { me } from '../../../lib/api/__fixtures__/backendResponses';
import { FakeTransport } from '../../../lib/api/fakeTransport';
import { setTransport, type Transport } from '../../../lib/api/transport';
import { renderRoutes } from '../../../testUtils';
import { ProtectedRoute } from './ProtectedRoute';

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
    fake = new FakeTransport().on('GET', '/auth/me', me);
    previous = setTransport(fake);
});

afterEach(() => {
    setTransport(previous);
});

const routes = [
    { path: '/login', element: <p>login page</p> },
    { path: '/', element: <ProtectedRoute><p>sessions</p></ProtectedRoute> },
];

it('sends someone signed out to the login', async () => {
    useAuthStore.setState({ token: null, user: null, userId: null, isAuthenticated: false });
    const { router } = renderRoutes(routes, '/');

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(screen.getByText('login page')).toBeInTheDocument();
});

it('shows the page to someone signed in and fetches them after a reload', async () => {
    useAuthStore.setState({ token: 'token', user: null, userId: me.id, isAuthenticated: true, isLoadingUser: false });
    renderRoutes(routes, '/');

    expect(screen.getByText('sessions')).toBeInTheDocument();
    await waitFor(() => expect(useAuthStore.getState().user).toEqual(me));
});
