import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { SessionRecapDto } from '../../api/generated/model';
import { sessionRecap } from '../../lib/api/__fixtures__/backendResponses';
import { FakeTransport } from '../../lib/api/fakeTransport';
import { setTransport, Transport } from '../../lib/api/transport';
import { currentPath, renderRoutes } from '../../testUtils';
import { RecapView } from './RecapView';

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
    fake = new FakeTransport();
    previous = setTransport(fake);
});

afterEach(() => {
    setTransport(previous);
});

function renderRecap(recap: SessionRecapDto | (() => never)) {
    fake.on('GET', '/sessions/recap', recap);
    return renderRoutes([{ path: '/recap/:sessionKey', element: <RecapView /> }], `/recap/${sessionRecap.session.key}`);
}

it('shows the best and the boldest pan and ranks the participants by XP', async () => {
    renderRecap(sessionRecap);

    expect(await screen.findByText(sessionRecap.session.name)).toBeInTheDocument();
    expect(fake.last('GET', '/sessions/recap')?.query).toEqual({ session_key: sessionRecap.session.key });
    expect(screen.getByText('recap.bestPan')).toBeInTheDocument();
    expect(screen.getByText('recap.boldestPan')).toBeInTheDocument();
    expect(screen.getByText(`${sessionRecap.boldest_pan?.xp} XP`)).toBeInTheDocument();
    expect(screen.queryByText('recap.worstPan')).not.toBeInTheDocument();

    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(sessionRecap.participants.length);
    sessionRecap.participants.forEach((participant, rank) => {
        expect(within(rows[rank]).getByText(participant.user.name)).toBeInTheDocument();
    });
    expect(within(rows[0]).getByText('🥇')).toBeInTheDocument();
});

it('says so when nobody rolled', async () => {
    renderRecap({
        ...sessionRecap,
        pan_count: 0,
        rating_count: 0,
        best_pan: null,
        worst_pan: null,
        boldest_pan: null,
        favorite_ingredient: null,
        participants: [],
    });

    expect(await screen.findByText('recap.nothingRolled')).toBeInTheDocument();
});

it('goes back to an open session, or to the sessions once it is closed', async () => {
    renderRecap({ ...sessionRecap, session: { ...sessionRecap.session, active: true } });
    fireEvent.click(await screen.findByText('recap.backToSession'));
    await waitFor(() => expect(currentPath()).toBe(`/${sessionRecap.session.id}/dashboard`));
});

it('goes back to the sessions from a closed one', async () => {
    renderRecap({ ...sessionRecap, session: { ...sessionRecap.session, active: false } });
    fireEvent.click(await screen.findByText('session.backToSessions'));
    await waitFor(() => expect(currentPath()).toBe('/'));
});

it('says the session is unknown when the recap fails', async () => {
    renderRecap(() => {
        throw Object.assign(new Error('Not Found'), { status: 404 });
    });

    expect(await screen.findByText('session.sessionNotFound')).toBeInTheDocument();
});
