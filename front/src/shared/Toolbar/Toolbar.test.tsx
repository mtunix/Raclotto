import { fireEvent, screen, waitFor } from '@testing-library/react';
import { type RouteObject } from 'react-router';
import { useAppStore } from '../../AppSlice';
import { useAuthStore } from '../../AuthSlice';
import { me, session, userProfile } from '../../lib/api/__fixtures__/backendResponses';
import { FakeTransport } from '../../lib/api/fakeTransport';
import { setTransport, type Transport } from '../../lib/api/transport';
import { currentPath, renderRoutes, settle } from '../../testUtils';
import { Toolbar } from './Toolbar';

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
    fake = new FakeTransport().on('GET', `/users/${me.id}`, userProfile);
    previous = setTransport(fake);
    useAppStore.setState({ session });
    useAuthStore.setState({ user: me, token: 'token', isAuthenticated: true });
});

afterEach(() => {
    setTransport(previous);
});

const toolbar = <Toolbar ingredients={[]} session={session.key} sessionId={String(session.id)} sessionClosed={() => {}} />;
const routes: RouteObject[] = [{ path: '/:sessionId/:view?', element: toolbar }];
const views = ['dashboard', 'generate', 'history', 'add', 'achievements', 'settings'];

function renderAt(path: string) {
    return renderRoutes(routes, path);
}

const button = (label: string) => screen.getByText(label).closest('button') as HTMLElement;
const labels = ['common.dashboard', 'common.shuffle', 'common.history', 'ingredient.ingredients', 'common.achievements', 'common.settings'];

it("shows the session's name and a button per view", async () => {
    renderAt(`/${session.id}`);

    expect(screen.getAllByText(session.name).length).toBeGreaterThan(0);
    for (const label of labels) {
        expect(button(label)).toBeInTheDocument();
    }
    await settle();
});

it.each(labels.map((label, i) => [label, views[i]]))('%s opens the %s view', async (label, view) => {
    const { router } = renderAt(`/${session.id}`);

    fireEvent.click(button(label));

    await waitFor(() => expect(router.state.location.pathname).toBe(`/${session.id}/${view}`));
});

it('highlights the open view and stays on it when clicked again', async () => {
    const { router } = renderAt(`/${session.id}/history`);

    expect(button('common.history')).toHaveClass('ant-btn-primary');
    expect(button('common.shuffle')).not.toHaveClass('ant-btn-primary');
    fireEvent.click(button('common.history'));

    expect(router.state.location.pathname).toBe(`/${session.id}/history`);
    expect(router.state.historyAction).toBe('POP');
    await settle();
});

it("opens the signed-in user's profile from the avatar", async () => {
    const { container, router } = renderAt(`/${session.id}`);

    fireEvent.click(container.querySelector('.toolbar-profile-avatar') as HTMLElement);

    await waitFor(() => expect(router.state.location.pathname).toBe(`/${session.id}/profile/${me.id}`));
});

it("shows the profile's current picture rather than the one the user signed in with", async () => {
    const picture = 'data:image/png;base64,bmV3';
    fake.on('GET', `/users/${me.id}`, { ...userProfile, profile_picture: picture });
    const { container } = renderAt(`/${session.id}`);

    await waitFor(() => expect(container.querySelector('.toolbar-profile-avatar img')).toHaveAttribute('src', picture));
});

it('leaves the session for the start screen', async () => {
    renderRoutes([{ path: '/:sessionId', element: toolbar }], `/${session.id}`);

    fireEvent.click(screen.getAllByText(/session\.leave/)[0]);

    await waitFor(() => expect(currentPath()).toBe('/'));
    expect(useAppStore.getState().session).toBeNull();
    expect(useAuthStore.getState().user).toEqual(me);
});

it('signs out to the login page', async () => {
    const { router } = renderAt(`/${session.id}`);

    fireEvent.click(screen.getByText('auth.logout'));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(useAppStore.getState().session).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
});

it("shows the session's join link as a QR code to scan", async () => {
    renderAt(`/${session.id}`);

    fireEvent.click(screen.getAllByText('join.inviteToTable')[0]);

    expect(await screen.findByText(`${window.location.origin}/join/${session.join_code}`)).toBeInTheDocument();
    expect(document.querySelector('.join-qr-code svg')).not.toBeNull();
});

it('asks a guest before logging out, since they could not sign in again', async () => {
    useAuthStore.setState({ user: { ...me, is_guest: true } });
    renderAt(`/${session.id}`);

    fireEvent.click(button('auth.logout'));

    expect(await screen.findByText('guest.logoutWarning')).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    fireEvent.click(screen.getAllByRole('button', { name: 'auth.logout' }).at(-1) as HTMLElement);
    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(false));
});
