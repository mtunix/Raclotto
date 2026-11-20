import { fireEvent, screen, waitFor } from '@testing-library/react';
import { useAuthStore } from '../../../AuthSlice';
import { loginResult } from '../../../lib/api/__fixtures__/backendResponses';
import { FakeTransport } from '../../../lib/api/fakeTransport';
import { setTransport, UnauthorizedError, type Transport } from '../../../lib/api/transport';
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

it('says the credentials are wrong on a 401 and stays signed out', async () => {
    fake.on('POST', '/auth/login', () => {
        throw new UnauthorizedError();
    });
    const { router } = renderRoutes([{ path: '/login', element: <LoginView /> }], '/login');

    fireEvent.change(screen.getByLabelText('auth.emailOrName'), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText('auth.password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'auth.login' }));

    expect(await screen.findByText('auth.invalidCredentials')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
});

it('says to wait after too many failed sign-ins', async () => {
    fake.on('POST', '/auth/login', () => {
        throw Object.assign(new Error('Request failed with status code 429'), { status: 429 });
    });
    renderRoutes([{ path: '/login', element: <LoginView /> }], '/login');

    fireEvent.change(screen.getByLabelText('auth.emailOrName'), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText('auth.password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'auth.login' }));

    expect(await screen.findByText('auth.tooManyAttempts')).toBeInTheDocument();
});
