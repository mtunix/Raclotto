import { fireEvent, screen, waitFor } from '@testing-library/react';
import { useAppStore } from '../../../AppSlice';
import { useAuthStore } from '../../../AuthSlice';
import { joinLookup, joinResult, me } from '../../../lib/api/__fixtures__/backendResponses';
import { FakeTransport } from '../../../lib/api/fakeTransport';
import { setTransport, type Transport } from '../../../lib/api/transport';
import { currentPath, renderRoutes } from '../../../testUtils';
import { JoinView } from './JoinView';

const routes = [{ path: '/join/:code', element: <JoinView /> }];
const CODE = 'a+b/c';
const failure = (status: number) => () => {
    throw Object.assign(new Error(`Request failed with status code ${status}`), { status });
};

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
    fake = new FakeTransport()
        .on('GET', `/auth/join/${encodeURIComponent(CODE)}`, joinLookup)
        .on('POST', '/auth/join', joinResult)
        .on('PATCH', '/auth/me', joinResult.user);
    previous = setTransport(fake);
    useAuthStore.setState({ token: null, user: null, userId: null, isAuthenticated: false });
    useAppStore.setState({ session: null });
});

afterEach(() => {
    setTransport(previous);
});

const open = () => renderRoutes(routes, `/join/${encodeURIComponent(CODE)}`);

it('joins as a guest with a name and the diet picked, then opens the session', async () => {
    open();

    fireEvent.change(await screen.findByLabelText('auth.name'), { target: { value: ' Eve ' } });
    fireEvent.click(screen.getByText('tags.fish'));
    fireEvent.click(screen.getByRole('button', { name: 'join.join' }));

    await waitFor(() => expect(currentPath()).toBe(`/${joinResult.session.id}/generate`));
    expect(fake.last('POST', '/auth/join')?.body).toEqual({ join_code: CODE, name: 'Eve' });
    expect(fake.last('PATCH', '/auth/me')?.body).toMatchObject({ fish: true });
    expect(useAuthStore.getState()).toMatchObject({ token: joinResult.token, isAuthenticated: true });
    expect(useAppStore.getState().session).toEqual(joinResult.session);
});

it('sends someone already signed in straight to the session', async () => {
    useAuthStore.setState({ token: 'token', user: me, userId: me.id, isAuthenticated: true });
    open();

    await waitFor(() => expect(currentPath()).toBe(`/${joinLookup.session_id}/generate`));
    expect(fake.last('POST', '/auth/join')).toBeUndefined();
});

it('offers signing in instead and comes back to the link afterwards', async () => {
    const { router } = open();

    fireEvent.click(await screen.findByText('join.haveAccount'));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(new URLSearchParams(router.state.location.search).get('next')).toBe(`/join/${CODE}`);
});

it('says when the link is not valid', async () => {
    fake.on('GET', `/auth/join/${encodeURIComponent(CODE)}`, failure(400));
    open();

    expect(await screen.findByText('join.invalidLink')).toBeInTheDocument();
    expect(screen.queryByLabelText('auth.name')).not.toBeInTheDocument();
});

it('takes no guests into a closed session', async () => {
    fake.on('GET', `/auth/join/${encodeURIComponent(CODE)}`, { ...joinLookup, active: false });
    open();

    expect(await screen.findByText('join.closedSession')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'join.join' })).not.toBeInTheDocument();
});

it("shows why joining failed, such as a taken name, and stays", async () => {
    fake.on('POST', '/auth/join', () => {
        throw Object.assign(new Error('Request failed with status code 400'), {
            response: { status: 400, data: { errors: [{ code: 'api_error_code.incorrect_parameters' }] } },
        });
    });
    const { router } = open();

    fireEvent.change(await screen.findByLabelText('auth.name'), { target: { value: 'Ada' } });
    fireEvent.click(screen.getByRole('button', { name: 'join.join' }));

    expect(await screen.findByText('apiError.api_error_code.incorrect_parameters')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/join/${encodeURIComponent(CODE)}`);
});
