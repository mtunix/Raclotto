import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useAuthStore } from '../../../AuthSlice';
import { grantedAdmin, me, users } from '../../../lib/api/__fixtures__/backendResponses';
import { FakeTransport } from '../../../lib/api/fakeTransport';
import { setTransport, type Transport } from '../../../lib/api/transport';
import { renderRoute } from '../../../testUtils';
import { AdminsSection } from './AdminsSection';

const [ada, ben, cleo, dora] = users;
const admin = { ...me, is_admin: true };

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
    fake = new FakeTransport().on('GET', '/users', users);
    previous = setTransport(fake);
    useAuthStore.setState({ user: admin });
});

afterEach(() => {
    setTransport(previous);
});

const adminSwitch = (name: string) => screen.getByRole('switch', { name });
const row = (name: string) => adminSwitch(name).closest('.item-list-row') as HTMLElement;

async function renderSection() {
    renderRoute(<AdminsSection />);
    await screen.findByRole('switch', { name: dora.name });
}

it('lists every user with their rights, marking the admins and the signed-in user', async () => {
    await renderSection();

    expect(adminSwitch(dora.name)).toBeChecked();
    for (const user of [ada, ben, cleo]) expect(adminSwitch(user.name)).not.toBeChecked();
    expect(screen.getAllByText('settings.admin')).toHaveLength(1);
    expect(within(row(dora.name)).getByText('settings.admin')).toBeInTheDocument();
    expect(within(row(ada.name)).getByText('settings.you')).toBeInTheDocument();
    expect(within(row(ada.name)).getByText('settings.ownAdminLocked')).toBeInTheDocument();
});

it("lets an admin change anyone's rights but their own", async () => {
    await renderSection();

    expect(adminSwitch(ada.name)).toBeDisabled();
    for (const user of [ben, cleo, dora]) expect(adminSwitch(user.name)).toBeEnabled();
});

it("leaves everyone's rights alone for a user who isn't an admin", async () => {
    useAuthStore.setState({ user: me });
    await renderSection();

    for (const user of users) expect(adminSwitch(user.name)).toBeDisabled();
});

it('grants admin and shows the user as an admin', async () => {
    fake.on('PATCH', `/users/${ben.id}`, grantedAdmin);
    await renderSection();

    fireEvent.click(adminSwitch(ben.name));

    expect(await screen.findByText('settings.adminGranted')).toBeInTheDocument();
    expect(fake.last('PATCH', `/users/${ben.id}`)?.body).toEqual({ is_admin: true });
    expect(adminSwitch(ben.name)).toBeChecked();
    expect(within(row(ben.name)).getByText('settings.admin')).toBeInTheDocument();
});

it('revokes admin and shows the user as one no longer', async () => {
    fake.on('PATCH', `/users/${dora.id}`, { ...dora, is_admin: false });
    await renderSection();

    fireEvent.click(adminSwitch(dora.name));

    expect(await screen.findByText('settings.adminRevoked')).toBeInTheDocument();
    expect(fake.last('PATCH', `/users/${dora.id}`)?.body).toEqual({ is_admin: false });
    expect(adminSwitch(dora.name)).not.toBeChecked();
    expect(screen.queryByText('settings.admin')).not.toBeInTheDocument();
});

it('keeps the rights as they were when the backend refuses the change', async () => {
    fake.on('PATCH', `/users/${ben.id}`, () => {
        throw Object.assign(new Error('Forbidden'), { status: 403 });
    });
    await renderSection();

    fireEvent.click(adminSwitch(ben.name));

    expect(await screen.findByText('settings.adminChangeFailed')).toBeInTheDocument();
    expect(adminSwitch(ben.name)).not.toBeChecked();
    await waitFor(() => expect(adminSwitch(ben.name)).toBeEnabled());
});
