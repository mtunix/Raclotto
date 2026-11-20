import { fireEvent, screen, waitFor } from '@testing-library/react';
import { useAuthStore } from '../../../AuthSlice';
import { loginResult } from '../../../lib/api/__fixtures__/backendResponses';
import { FakeTransport } from '../../../lib/api/fakeTransport';
import { setTransport, type Transport } from '../../../lib/api/transport';
import { renderRoutes } from '../../../testUtils';
import { LoginView } from './LoginView';

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
    fake = new FakeTransport().on('POST', '/auth/login', loginResult);
    previous = setTransport(fake);
    useAuthStore.setState({ token: null, user: null, userId: null, isAuthenticated: false });
});

afterEach(() => {
    setTransport(previous);
});

async function signIn(path: string) {
    const { router } = renderRoutes([{ path: '/login', element: <LoginView /> }], path);
    fireEvent.change(screen.getByLabelText('auth.emailOrName'), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText('auth.password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'auth.login' }));
    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true));
    return router;
}

it('goes to the session list after signing in', async () => {
    const router = await signIn('/login');

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
});

it('goes back to where the link pointed, inside the app only', async () => {
    const back = await signIn(`/login?next=${encodeURIComponent('/join/abc')}`);
    await waitFor(() => expect(back.state.location.pathname).toBe('/join/abc'));
});

it('ignores a next that leads out of the app', async () => {
    const away = await signIn(`/login?next=${encodeURIComponent('//evil.example/x')}`);
    await waitFor(() => expect(away.state.location.pathname).toBe('/'));
});
