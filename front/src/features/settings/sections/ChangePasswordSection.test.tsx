import { fireEvent, screen, waitFor } from '@testing-library/react';
import { useAuthStore } from '../../../AuthSlice';
import { ApiErrorCode } from '../../../api/generated/model';
import { me } from '../../../lib/api/__fixtures__/backendResponses';
import { FakeTransport } from '../../../lib/api/fakeTransport';
import { setTransport, type Transport } from '../../../lib/api/transport';
import { renderRoute } from '../../../testUtils';
import { ChangePasswordSection } from './ChangePasswordSection';

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
    fake = new FakeTransport();
    previous = setTransport(fake);
    useAuthStore.setState({ user: me, userId: me.id, token: 'old-token', isAuthenticated: true });
});

afterEach(() => {
    setTransport(previous);
});

const current = () => screen.getByLabelText('settings.currentPassword');
const next = () => screen.getByLabelText('settings.newPassword');
const confirmation = () => screen.getByLabelText('auth.confirmPassword');
const submit = () => screen.getByRole('button', { name: 'settings.changePassword' });
const answered = (status: number, code: ApiErrorCode) =>
    Object.assign(new Error(`Request failed with status code ${status}`), {
        response: { status, data: { errors: [{ code, title: 'Error', detail: 'English detail' }] } },
    });

function changePassword(currentPassword: string, newPassword: string, confirmed = newPassword) {
    fireEvent.change(current(), { target: { value: currentPassword } });
    fireEvent.change(next(), { target: { value: newPassword } });
    fireEvent.change(confirmation(), { target: { value: confirmed } });
    fireEvent.click(submit());
}

it('changes the password, keeps this device signed in with the new token and clears the form', async () => {
    fake.on('POST', '/auth/password', { token: 'new-token' });
    renderRoute(<ChangePasswordSection />);

    changePassword('old-secret', 'new-secret');

    expect(await screen.findByText('settings.passwordChanged')).toBeInTheDocument();
    expect(fake.last('POST', '/auth/password')?.body).toEqual({ current_password: 'old-secret', new_password: 'new-secret' });
    expect(useAuthStore.getState().token).toBe('new-token');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    for (const field of [current(), next(), confirmation()]) expect(field).toHaveValue('');
});

it('locks the form while the change is on its way', async () => {
    fake.on('POST', '/auth/password', () => new Promise(() => {}));
    renderRoute(<ChangePasswordSection />);

    changePassword('old-secret', 'new-secret');

    await waitFor(() => expect(current()).toBeDisabled());
    expect(next()).toBeDisabled();
    expect(confirmation()).toBeDisabled();
});

it('says when the current password is wrong and keeps the old token', async () => {
    fake.on('POST', '/auth/password', () => {
        throw answered(400, ApiErrorCode.incorrect_parameters);
    });
    renderRoute(<ChangePasswordSection />);

    changePassword('wrong', 'new-secret');

    expect(await screen.findByRole('alert')).toHaveTextContent('settings.wrongPassword');
    expect(useAuthStore.getState().token).toBe('old-token');
    expect(current()).toHaveValue('wrong');
    expect(current()).toBeEnabled();
});

it('says saving failed for any other failure', async () => {
    fake.on('POST', '/auth/password', () => {
        throw answered(500, ApiErrorCode.internal_error);
    });
    renderRoute(<ChangePasswordSection />);

    changePassword('old-secret', 'new-secret');

    expect(await screen.findByRole('alert')).toHaveTextContent('common.saveFailed');
});

it('drops the last failure once a retry succeeds', async () => {
    let attempts = 0;
    fake.on('POST', '/auth/password', () => {
        attempts += 1;
        if (attempts === 1) throw answered(400, ApiErrorCode.incorrect_parameters);
        return { token: 'new-token' };
    });
    renderRoute(<ChangePasswordSection />);

    changePassword('wrong', 'new-secret');
    expect(await screen.findByText('settings.wrongPassword')).toBeInTheDocument();
    changePassword('old-secret', 'new-secret');

    expect(await screen.findByText('settings.passwordChanged')).toBeInTheDocument();
    expect(screen.queryByText('settings.wrongPassword')).not.toBeInTheDocument();
});

it('sends nothing until every field is filled, the new password long enough and repeated', async () => {
    renderRoute(<ChangePasswordSection />);

    fireEvent.click(submit());
    expect(await screen.findAllByText('auth.passwordRequired')).toHaveLength(2);
    expect(screen.getByText('auth.confirmPasswordRequired')).toBeInTheDocument();

    changePassword('old-secret', 'short');
    expect(await screen.findByText('auth.passwordTooShort')).toBeInTheDocument();

    changePassword('old-secret', 'long-enough', 'different');
    expect(await screen.findByText('auth.passwordsDoNotMatch')).toBeInTheDocument();

    expect(fake.last('POST', '/auth/password')).toBeUndefined();
});
