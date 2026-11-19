import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { RouteObject } from 'react-router';
import { useAppStore } from '../../../AppSlice';
import { useAuthStore } from '../../../AuthSlice';
import type { PanDto, PanPageDto, SessionDto } from '../../../api/generated/model';
import { generatedPicture, me, panPage, rating, rollOutcome, session } from '../../../lib/api/__fixtures__/backendResponses';
import { FakeTransport, RecordedRequest } from '../../../lib/api/fakeTransport';
import { setTransport, Transport } from '../../../lib/api/transport';
import { currentPath, renderRoutes } from '../../../testUtils';
import { HistoryView } from './HistoryView';

const [newest] = panPage.items;
const pan = (id: number, overrides: Partial<PanDto> = {}): PanDto => ({ ...newest, id, name: `Pan ${id}`, ...overrides });

/** `total` pans with ids total..1, newest first, a page at a time. */
function backend(total: number) {
    return (request: RecordedRequest): PanPageDto => {
        const { limit, offset } = request.query as { limit: number; offset: number };
        const ids = Array.from({ length: total }, (_, i) => total - i).slice(offset, offset + limit);
        return { items: ids.map((id) => pan(id)), total, limit, offset, has_more: offset + ids.length < total };
    };
}

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
    fake = new FakeTransport();
    previous = setTransport(fake);
    useAuthStore.setState({ user: me });
});

afterEach(() => {
    setTransport(previous);
});

const routes: RouteObject[] = [{ path: '/:sessionId/history', element: <HistoryView /> }];

// Pan lists are invalidated through SWR's global cache, so every test gets a session key of its own.
let sessions = 0;
function renderHistory(): SessionDto {
    sessions += 1;
    const current = { ...session, key: `history-${sessions}` };
    useAppStore.setState({ session: current });
    renderRoutes(routes, `/${current.id}/history`, { sharedCache: true });
    return current;
}

const cardOf = (name: string) => screen.getByText(name).closest('.ant-card') as HTMLElement;

it('shows a spinner while the first page loads', () => {
    fake.on('GET', '/pans', () => new Promise(() => {}));
    renderHistory();

    expect(document.querySelector('.ant-spin')).toBeInTheDocument();
});

it('says so when the session has no pans yet', async () => {
    fake.on('GET', '/pans', { ...panPage, items: [], total: 0, has_more: false });
    renderHistory();

    expect(await screen.findByText('history.noPans')).toBeInTheDocument();
});

it("lists the session's pans with their author, ingredients and average rating", async () => {
    fake.on('GET', '/pans', { ...panPage, has_more: false });
    const current = renderHistory();

    const card = await screen.findByText(newest.name as string).then(() => cardOf(newest.name as string));
    expect(fake.last('GET', '/pans')?.query).toEqual({ session_key: current.key, limit: 12, offset: 0 });
    expect(within(card).getByText(newest.author!.name)).toBeInTheDocument();
    for (const ingredient of newest.ingredients) {
        expect(within(card).getByText(ingredient.name as string)).toBeInTheDocument();
    }
    expect(within(card).getByText(newest.rating.toFixed(1))).toBeInTheDocument();
});

it('loads the next page on demand', async () => {
    fake.on('GET', '/pans', backend(14));
    renderHistory();

    await screen.findByText('Pan 14');
    expect(screen.queryByText('Pan 2')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('history.loadMore'));

    expect(await screen.findByText('Pan 2')).toBeInTheDocument();
    expect(screen.getByText('Pan 14')).toBeInTheDocument();
    expect(fake.last('GET', '/pans')?.query).toMatchObject({ offset: 12 });
    expect(screen.queryByText('history.loadMore')).not.toBeInTheDocument();
});

it('rates a pan and shows its fresh average', async () => {
    let average = newest.rating;
    fake.on('GET', '/pans', () => ({ ...panPage, has_more: false, items: [{ ...newest, rating: average }] }))
        .on('POST', '/ratings', () => {
            average = 3.8;
            return { ...rating, pan_id: newest.id, rating: 3 };
        })
        .on('GET', `/pans/${newest.id}`, () => ({ ...newest, rating: average }));
    renderHistory();
    const card = await screen.findByText(newest.name as string).then(() => cardOf(newest.name as string));

    const thirdStar = within(card).getAllByRole('radio')[2];
    fireEvent.click(thirdStar.querySelector('.ant-rate-star-second') as HTMLElement);

    expect(await within(card).findByText('3.8')).toBeInTheDocument();
    expect(fake.last('POST', '/ratings')?.body).toEqual({ pan_id: newest.id, rating: 3 });
    expect(fake.last('GET', `/pans/${newest.id}`)).toBeDefined();
});

it('rolls a copy of a pan after asking, and applies the reward', async () => {
    fake.on('GET', '/pans', { ...panPage, has_more: false })
        .on('POST', '/pans', rollOutcome);
    const current = renderHistory();
    const card = await screen.findByText(newest.name as string).then(() => cardOf(newest.name as string));

    fireEvent.click(within(card).getByText('history.iWantThisToo'));
    const confirm = await screen.findByRole('dialog');
    await act(async () => {
        fireEvent.click(within(confirm).getByText('OK'));
    });

    await waitFor(() => expect(fake.last('POST', '/pans')).toBeDefined());
    const request = fake.last('POST', '/pans');
    expect(request?.query).toEqual({ session_key: current.key });
    expect(request?.body).toEqual({ name: newest.name, ingredients: newest.ingredients.map((i) => i.id) });
    await waitFor(() => expect(useAuthStore.getState().user?.experience_points).toBe(rollOutcome.reward.xp_after));
    expect(useAppStore.getState().xpNotification).toMatchObject({ visible: true, reward: rollOutcome.reward });
});

it("shows the copy, and offers the level-up picture once it closes", async () => {
    fake.on('GET', '/pans', { ...panPage, has_more: false })
        .on('POST', '/pans', rollOutcome)
        .on('POST', '/images/generate-profile-picture', generatedPicture)
        .on('GET', '/auth/me', me);
    renderHistory();
    const card = await screen.findByText(newest.name as string).then(() => cardOf(newest.name as string));
    fireEvent.click(within(card).getByText('history.iWantThisToo'));
    const confirm = await screen.findByRole('dialog');
    await act(async () => {
        fireEvent.click(within(confirm).getByText('OK'));
    });

    const result = await screen.findByText(/level.leveledUp/);
    fireEvent.click(within(result.closest('.ant-modal') as HTMLElement).getByText('common.close'));

    await waitFor(() => expect(fake.last('POST', '/images/generate-profile-picture')?.body)
        .toEqual({ level_id: rollOutcome.reward.level?.id }));
});

it("opens the author's profile from their avatar", async () => {
    fake.on('GET', '/pans', { ...panPage, has_more: false });
    renderHistory();
    const card = await screen.findByText(newest.name as string).then(() => cardOf(newest.name as string));

    fireEvent.click(card.querySelector('.ant-avatar') as HTMLElement);

    await waitFor(() => expect(currentPath()).toBe(`/${session.id}/profile/${newest.author!.id}`));
});
