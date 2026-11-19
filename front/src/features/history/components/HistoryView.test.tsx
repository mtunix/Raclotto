import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { type RouteObject } from 'react-router';
import { useAppStore } from '../../../AppSlice';
import { useAuthStore } from '../../../AuthSlice';
import type { PanDto, PanPageDto, SessionDto } from '../../../api/generated/model';
import { generatedPicture, imageGeneration, me, panFilterOptions, panPage, rating, rollOutcome, session } from '../../../lib/api/__fixtures__/backendResponses';
import { FakeTransport, type RecordedRequest } from '../../../lib/api/fakeTransport';
import { setTransport, type Transport } from '../../../lib/api/transport';
import { currentPath, renderRoutes, setViewportWidth } from '../../../testUtils';
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
    fake.on('GET', '/pans/filters', panFilterOptions).on('GET', '/images/generation', imageGeneration);
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
    expect(fake.last('GET', '/pans')?.query).toEqual({
        session_key: current.key,
        sort: 'time',
        direction: 'desc',
        limit: 12,
        offset: 0,
    });
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
    fireEvent.click(within(confirm).getByText('OK'));

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
    fireEvent.click(within(confirm).getByText('OK'));

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

async function choose(current: string, option: string) {
    fireEvent.mouseDown(screen.getByText(current).closest('.ant-select') as HTMLElement);
    const options = await screen.findAllByText(option);
    fireEvent.click(options[options.length - 1]);
}

it('asks the server for the best-rated pans first, whatever is loaded', async () => {
    fake.on('GET', '/pans', (request: RecordedRequest) =>
        (request.query as { sort: string }).sort === 'rating'
            ? { ...panPage, has_more: false, items: [pan(1, { rating: 5 }), pan(14)] }
            : backend(14)(request));
    renderHistory();
    await screen.findByText('Pan 14');
    expect(screen.queryByText('Pan 1')).not.toBeInTheDocument();

    await choose('history.time', 'history.rating');

    expect(await screen.findByText('Pan 1')).toBeInTheDocument();
    expect(fake.last('GET', '/pans')?.query).toMatchObject({ sort: 'rating', direction: 'desc', offset: 0 });
    const names = screen.getAllByRole('heading', { level: 4 }).map((heading) => heading.textContent);
    expect(names).toEqual(['Pan 1', 'Pan 14']);
});

it('shows sorting and filters open on a desktop', async () => {
    setViewportWidth(1280);
    fake.on('GET', '/pans', { ...panPage, has_more: false });
    renderHistory();
    await screen.findByText(newest.name as string);

    expect(screen.getByText('history.time')).toBeInTheDocument();
    expect(screen.getByText('history.users')).toBeInTheDocument();
    expect(screen.queryByText('history.sortAndFilters')).not.toBeInTheDocument();
});

it('folds sorting and filters behind a toggle on a phone', async () => {
    setViewportWidth(390);
    fake.on('GET', '/pans', { ...panPage, has_more: false });
    renderHistory();
    await screen.findByText(newest.name as string);
    expect(screen.queryByText('history.time')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('history.sortAndFilters'));

    expect(screen.getByText('history.time')).toBeInTheDocument();
    expect(screen.getByText('history.users')).toBeInTheDocument();
});

it("offers every user of the session to filter by, and keeps the filters when nothing matches", async () => {
    const [ada, ben] = panFilterOptions.users;
    fake.on('GET', '/pans', (request: RecordedRequest) =>
        (request.query as { user_id?: number[] }).user_id
            ? { ...panPage, items: [], total: 0, has_more: false }
            : { ...panPage, has_more: false, items: [pan(1, { author: ada, user_id: ada.id })] });
    const current = renderHistory();
    await screen.findByText('Pan 1');

    fireEvent.click(screen.getByText('history.users'));
    fireEvent.click(await screen.findByText(ben.name));

    expect(await screen.findByText('history.noPans')).toBeInTheDocument();
    expect(fake.last('GET', '/pans')?.query).toMatchObject({ session_key: current.key, user_id: [ben.id], offset: 0 });
    expect(fake.last('GET', '/pans/filters')?.query).toEqual({ session_key: current.key });
    expect(screen.getByText('history.users')).toBeInTheDocument();
});
