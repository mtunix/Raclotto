import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { ApiErrorCode, type InviteDto } from '../../../api/generated/model';
import { invite } from '../../../lib/api/__fixtures__/backendResponses';
import { FakeTransport } from '../../../lib/api/fakeTransport';
import { setTransport, type Transport } from '../../../lib/api/transport';
import { renderRoute } from '../../../testUtils';
import { InvitesSection } from './InvitesSection';

const DAY = 24 * 60 * 60 * 1000;
const inDays = (days: number) => new Date(Date.now() + days * DAY).toISOString();

const active: InviteDto = { ...invite, expires_at: inDays(7) };
const used: InviteDto = { ...invite, id: 2, token: 'used-token', is_used: true, used_at: inDays(-1) };
const expired: InviteDto = { ...invite, id: 3, token: 'expired-token', expires_at: inDays(-1) };

let fake: FakeTransport;
let previous: Transport;
let invites: InviteDto[];
const writeText = vi.fn((_text: string) => Promise.resolve());

beforeAll(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
});

beforeEach(() => {
    invites = [active, used, expired];
    writeText.mockClear();
    fake = new FakeTransport().on('GET', '/invites', () => invites);
    previous = setTransport(fake);
});

afterEach(() => {
    setTransport(previous);
});

const inviteFetches = () => fake.requests.filter((r) => r.method === 'GET' && r.path === '/invites').length;
const row = (token: string) => screen.getByText(token).closest('.item-list-row') as HTMLElement;
const revokeButton = (token: string) => within(row(token)).queryByRole('button', { name: 'invite.revoke' });
const answered = (status: number, code: ApiErrorCode) =>
    Object.assign(new Error(`Request failed with status code ${status}`), {
        response: { status, data: { errors: [{ code, title: 'Error', detail: 'English detail' }] } },
    });

async function renderSection() {
    renderRoute(<InvitesSection />);
    await screen.findByText(invites[0].token);
}

function requestInvite() {
    fireEvent.click(screen.getByRole('button', { name: /invite\.generate/ }));
}

describe('the invites sent', () => {
    it('shows each one as active, used or expired, with its token', async () => {
        await renderSection();

        expect(within(row(active.token)).getByText('invite.active')).toBeInTheDocument();
        expect(within(row(used.token)).getByText('invite.used')).toBeInTheDocument();
        expect(within(row(used.token)).getByText('invite.usedAt:')).toBeInTheDocument();
        expect(within(row(expired.token)).getByText('invite.expired')).toBeInTheDocument();
        expect(within(row(active.token)).getByText('invite.createdAt:')).toBeInTheDocument();
        expect(within(row(active.token)).queryByText('invite.usedAt:')).not.toBeInTheDocument();
    });

    it('can be revoked only while still active', async () => {
        await renderSection();

        expect(revokeButton(active.token)).toBeInTheDocument();
        expect(revokeButton(used.token)).not.toBeInTheDocument();
        expect(revokeButton(expired.token)).not.toBeInTheDocument();
    });

    it('copies the registration link with the token', async () => {
        const token = 'a+b/c=';
        invites = [{ ...active, token }];
        await renderSection();

        fireEvent.click(within(row(token)).getByRole('button', { name: 'settings.copyToClipboard' }));

        await waitFor(() =>
            expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/register?token=${encodeURIComponent(token)}`),
        );
        expect(await screen.findByText('settings.copiedToClipboard')).toBeInTheDocument();
    });
});

describe('inviting someone', () => {
    it('creates a link and lists the new invite', async () => {
        const created: InviteDto = { ...active, id: 4, token: 'new-token' };
        fake.on('POST', '/invites', () => {
            invites = [created, ...invites];
            return created;
        });
        await renderSection();

        requestInvite();

        expect(await screen.findByText(created.token)).toBeInTheDocument();
        expect(fake.last('POST', '/invites')?.body).toBeUndefined();
        expect(await screen.findByText('invite.tokenCreated')).toBeInTheDocument();
    });

    it("shows what the backend's error code says", async () => {
        fake.on('POST', '/invites', () => {
            throw answered(400, ApiErrorCode.incorrect_parameters);
        });
        await renderSection();

        requestInvite();

        expect(await screen.findByText(`apiError.${ApiErrorCode.incorrect_parameters}`)).toBeInTheDocument();
        expect(screen.queryByText('invite.creationFailed')).not.toBeInTheDocument();
    });

    it('says it failed when no answer carries an error code', async () => {
        fake.on('POST', '/invites', () => {
            throw new Error('Network Error');
        });
        await renderSection();

        requestInvite();

        expect(await screen.findByText('invite.creationFailed')).toBeInTheDocument();
    });
});

describe('revoking an invite', () => {
    it('takes a second click to confirm, then revokes it and refreshes the list', async () => {
        fake.on('DELETE', `/invites/${active.id}`, undefined);
        await renderSection();

        fireEvent.click(revokeButton(active.token) as HTMLElement);
        expect(fake.last('DELETE', `/invites/${active.id}`)).toBeUndefined();

        invites = [{ ...active, expires_at: inDays(-1) }, used, expired];
        fireEvent.click(revokeButton(active.token) as HTMLElement);

        expect(await screen.findByText('invite.tokenRevoked')).toBeInTheDocument();
        expect(fake.last('DELETE', `/invites/${active.id}`)).toBeDefined();
        await waitFor(() => expect(inviteFetches()).toBe(2));
        await waitFor(() => expect(revokeButton(active.token)).not.toBeInTheDocument());
    });

    it("shows what the backend's error code says", async () => {
        fake.on('DELETE', `/invites/${active.id}`, () => {
            throw answered(404, ApiErrorCode.resource_not_found);
        });
        await renderSection();

        fireEvent.click(revokeButton(active.token) as HTMLElement);
        fireEvent.click(revokeButton(active.token) as HTMLElement);

        expect(await screen.findByText(`apiError.${ApiErrorCode.resource_not_found}`)).toBeInTheDocument();
        expect(inviteFetches()).toBe(1);
    });
});
