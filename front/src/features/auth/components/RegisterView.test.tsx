import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { useAuthStore } from '../../../AuthSlice';
import { inviteLookup, registeredMe, registration } from '../../../lib/api/__fixtures__/backendResponses';
import { FakeTransport } from '../../../lib/api/fakeTransport';
import { setTransport, type Transport } from '../../../lib/api/transport';
import { currentPath, renderRoutes } from '../../../testUtils';
import { RegisterView } from './RegisterView';

const routes = [{ path: '/register', element: <RegisterView /> }];
const failure = (status: number) => () => {
    throw Object.assign(new Error(`Request failed with status code ${status}`), { status });
};

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
    fake = new FakeTransport().on('POST', '/auth/register', registration).on('PATCH', '/auth/me', registeredMe);
    previous = setTransport(fake);
    useAuthStore.setState({ token: null, user: null, userId: null, isAuthenticated: false });
});

afterEach(() => {
    setTransport(previous);
});

const field = (label: string) => screen.getByLabelText(label);
const type = (label: string, value: string) => fireEvent.change(field(label), { target: { value } });

async function submit({ token = 'invite-token', email = inviteLookup.email, password = 'carl-secret', confirm = password }: {
    token?: string;
    email?: string;
    password?: string;
    confirm?: string;
} = {}) {
    if (!(field('auth.inviteToken') as HTMLInputElement).disabled) {
        type('auth.inviteToken', token);
        type('auth.email', email);
    }
    type('auth.name', registration.user.name);
    type('auth.password', password);
    type('auth.confirmPassword', confirm);
    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'auth.register' }));
    });
}

it('registers with an invite token, saves the diet picked and signs the new user in', async () => {
    renderRoutes(routes, '/register');

    fireEvent.click(screen.getByText('tags.fish'));
    await submit();

    await waitFor(() => expect(currentPath()).toBe('/'));
    expect(fake.last('POST', '/auth/register')?.body).toEqual({
        token: 'invite-token',
        email: inviteLookup.email,
        name: registration.user.name,
        password: 'carl-secret',
    });
    expect(fake.last('PATCH', '/auth/me')?.body).toEqual({
        meat: false,
        vegetarian: true,
        vegan: true,
        fish: true,
        gluten: true,
        histamine: true,
        fructose: true,
        lactose: true,
    });
    expect(useAuthStore.getState()).toMatchObject({ token: registration.token, user: registeredMe, isAuthenticated: true });
});

it('saves the diet by its hierarchy', async () => {
    renderRoutes(routes, '/register');

    fireEvent.click(screen.getByText('tags.meat'));
    fireEvent.click(screen.getByText('tags.vegan'));
    await submit();

    await waitFor(() => expect(fake.last('PATCH', '/auth/me')).toBeDefined());
    expect(fake.last('PATCH', '/auth/me')?.body).toMatchObject({ meat: true, vegetarian: true, vegan: true });
});

it('takes token and email from the invite link and locks them', async () => {
    const token = 'a/b+c';
    fake.on('GET', `/auth/invite/${encodeURIComponent(token)}`, inviteLookup);
    renderRoutes(routes, `/register?token=${encodeURIComponent(token)}`);

    await waitFor(() => expect(field('auth.email')).toHaveValue(inviteLookup.email));
    expect(field('auth.inviteToken')).toHaveValue(token);
    expect(field('auth.inviteToken')).toBeDisabled();
    expect(field('auth.email')).toBeDisabled();
    await submit();

    await waitFor(() => expect(currentPath()).toBe('/'));
    expect(fake.last('POST', '/auth/register')?.body).toMatchObject({ token, email: inviteLookup.email });
});

it('says when the invite link is not valid and leaves the fields open', async () => {
    fake.on('GET', '/auth/invite/spent', failure(400));
    renderRoutes(routes, '/register?token=spent');

    expect(await screen.findByText('auth.inviteTokenInvalid')).toBeInTheDocument();
    expect(field('auth.inviteToken')).toBeEnabled();
    expect(field('auth.inviteToken')).toHaveValue('');
    expect(field('auth.email')).toBeEnabled();
});

it('sends nothing while the passwords differ', async () => {
    renderRoutes(routes, '/register');

    await submit({ password: 'carl-secret', confirm: 'carl-secrets' });

    expect(await screen.findByText('auth.passwordsDoNotMatch')).toBeInTheDocument();
    expect(fake.last('POST', '/auth/register')).toBeUndefined();
});

it('says when registering fails and stays signed out', async () => {
    fake.on('POST', '/auth/register', failure(400));
    renderRoutes(routes, '/register');

    await submit();

    expect(await screen.findByText('auth.registrationFailed')).toBeInTheDocument();
    expect(screen.queryByTestId('current-path')).not.toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(fake.last('PATCH', '/auth/me')).toBeUndefined();
});

it('signs the new user in even when the diet cannot be saved', async () => {
    fake.on('PATCH', '/auth/me', failure(500));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderRoutes(routes, '/register');

    await submit();

    await waitFor(() => expect(currentPath()).toBe('/'));
    expect(useAuthStore.getState()).toMatchObject({ token: registration.token, user: registration.user });
    vi.mocked(console.error).mockRestore();
});
