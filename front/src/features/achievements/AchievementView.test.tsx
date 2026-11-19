import { render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import i18n from '../../i18n';
import type { AchievementStatusDto } from '../../api/generated/model';
import { achievementStatuses } from '../../lib/api/__fixtures__/backendResponses';
import { FakeTransport } from '../../lib/api/fakeTransport';
import { setTransport, type Transport } from '../../lib/api/transport';
import { achievementTitle } from '../../shared/achievementText';
import { AchievementView } from './AchievementView';

let fake: FakeTransport;
let previous: Transport;

beforeEach(async () => {
    await i18n.changeLanguage('de');
    fake = new FakeTransport();
    previous = setTransport(fake);
});

afterEach(() => {
    setTransport(previous);
});

function renderView(statuses: AchievementStatusDto[]) {
    fake.on('GET', '/achievements', statuses);
    // A cache of its own per render, so each test fetches.
    return render(
        <SWRConfig value={{ provider: () => new Map() }}>
            <AchievementView />
        </SWRConfig>,
    );
}

const [unlocked, inProgress] = achievementStatuses;
const title = (achievement: AchievementStatusDto) => achievementTitle(achievement, (key) => key);

it('shows every achievement the backend lists', async () => {
    renderView(achievementStatuses);

    await waitFor(() => expect(screen.getByText(title(unlocked))).toBeInTheDocument());
    for (const achievement of achievementStatuses.filter((a) => !a.hidden)) {
        expect(screen.getByText(title(achievement))).toBeInTheDocument();
    }
    expect(fake.requests).toEqual([{ method: 'GET', path: '/achievements', query: undefined, body: undefined }]);
});

it('marks unlocked achievements and shows the progress of the others', async () => {
    renderView([unlocked, inProgress, { ...inProgress, id: 99, key: null, progress: null }]);

    await waitFor(() => expect(screen.getByText(title(unlocked))).toBeInTheDocument());
    expect(screen.getAllByText('achievement.unlocked')).toHaveLength(1);
    expect(inProgress.progress).toBe(0.5);
    expect(screen.getAllByText(/% achievement\.complete/).map((n) => n.textContent)).toEqual(['50\u00a0% achievement.complete']);
});

it('hides the title and description of hidden achievements', async () => {
    renderView([{ ...inProgress, hidden: true }]);

    await waitFor(() => expect(screen.getAllByText('???')).toHaveLength(2));
    expect(screen.queryByText(title(inProgress))).not.toBeInTheDocument();
});

it('says so when there are none', async () => {
    renderView([]);

    await waitFor(() => expect(screen.getByText('achievement.noAchievements')).toBeInTheDocument());
});
