import { fireEvent, screen, waitFor } from '@testing-library/react';
import { useAuthStore } from '../../../AuthSlice';
import { claimedMe, joinResult } from '../../../lib/api/__fixtures__/backendResponses';
import { FakeTransport } from '../../../lib/api/fakeTransport';
import { setTransport, type Transport } from '../../../lib/api/transport';
import { renderRoute } from '../../../testUtils';
import { KeepAccountSection } from './KeepAccountSection';

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
    fake = new FakeTransport().on('POST', '/auth/claim', claimedMe).on('GET', '/auth/me', claimedMe);
    previous = setTransport(fake);
    useAuthStore.setState({ user: joinResult.user, token: joinResult.token, isAuthenticated: true });
});

afterEach(() => {
    setTransport(previous);
});

const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

it('sets a password, and an email if given, and the guest is one no more', async () => {
    renderRoute(<KeepAccountSection />);

    type('auth.email', 'eve@example.com');
    type('auth.password', 'eve-secret');
    type('auth.confirmPassword', 'eve-secret');
    fireEvent.click(screen.getByRole('button', { name: 'guest.keepAccountButton' }));

    expect(await screen.findByText('guest.kept')).toBeInTheDocument();
    expect(fake.last('POST', '/auth/claim')?.body).toEqual({ password: 'eve-secret', email: 'eve@example.com' });
    expect(useAuthStore.getState().user?.is_guest).toBe(false);
});

it('sends no email when none is given and nothing while the passwords differ', async () => {
    renderRoute(<KeepAccountSection />);

    type('auth.password', 'eve-secret');
    type('auth.confirmPassword', 'something-else');
    fireEvent.click(screen.getByRole('button', { name: 'guest.keepAccountButton' }));
    expect(await screen.findByText('auth.passwordsDoNotMatch')).toBeInTheDocument();
    expect(fake.last('POST', '/auth/claim')).toBeUndefined();

    type('auth.confirmPassword', 'eve-secret');
    fireEvent.click(screen.getByRole('button', { name: 'guest.keepAccountButton' }));
    await waitFor(() => expect(fake.last('POST', '/auth/claim')?.body).toEqual({ password: 'eve-secret' }));
});

it("shows what the backend's error code says", async () => {
    fake.on('POST', '/auth/claim', () => {
        throw Object.assign(new Error('Request failed with status code 400'), {
            response: { status: 400, data: { errors: [{ code: 'api_error_code.incorrect_parameters' }] } },
        });
    });
    renderRoute(<KeepAccountSection />);

    type('auth.email', 'ada@example.com');
    type('auth.password', 'eve-secret');
    type('auth.confirmPassword', 'eve-secret');
    fireEvent.click(screen.getByRole('button', { name: 'guest.keepAccountButton' }));

    expect(await screen.findByText('apiError.api_error_code.incorrect_parameters')).toBeInTheDocument();
    expect(useAuthStore.getState().user?.is_guest).toBe(true);
});
