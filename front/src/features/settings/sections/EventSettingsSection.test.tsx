import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { message } from 'antd';
import { useAppStore } from '../../../AppSlice';
import { useAuthStore } from '../../../AuthSlice';
import type { EventConfigDto, SessionDto } from '../../../api/generated/model';
import { eventConfig, eventConfigs, me, session } from '../../../lib/api/__fixtures__/backendResponses';
import { FakeTransport, type RecordedRequest } from '../../../lib/api/fakeTransport';
import { mutateEventConfigs } from '../../../lib/api/swrHooks';
import { setTransport, type Transport } from '../../../lib/api/transport';
import { renderRoute } from '../../../testUtils';
import { EventSettingsSection } from './EventSettingsSection';

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
    fake = new FakeTransport();
    previous = setTransport(fake);
    useAuthStore.setState({ user: me });
});

afterEach(() => {
    setTransport(previous);
    act(() => message.destroy());
});

const configFetches = () => fake.requests.filter((r) => r.method === 'GET' && r.path === '/events/configs').length;
const saveButton = () => screen.getByText('common.save').closest('button') as HTMLElement;
const toggle = () => screen.getByRole('switch');
const frequency = () => screen.getByRole('spinbutton');

// Saving refetches through SWR's global cache, so every test gets a session key of its own.
let sessions = 0;
async function renderSection(configs: EventConfigDto[] | ((request: RecordedRequest) => unknown)): Promise<SessionDto> {
    sessions += 1;
    const current = { ...session, key: `events-${sessions}` };
    fake.on('GET', '/events/configs', configs);
    useAppStore.setState({ session: current });
    renderRoute(<EventSettingsSection />, { sharedCache: true });
    await waitFor(() => expect(configFetches()).toBe(1));
    await screen.findByText('events.panSwap');
    return current;
}

describe('a session creator', () => {
    it("shows the session's config and offers no save until something changes", async () => {
        const current = await renderSection(eventConfigs);

        expect(fake.last('GET', '/events/configs')?.query).toEqual({ session_key: current.key });
        expect(toggle()).not.toBeChecked();
        expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
        expect(saveButton()).toBeDisabled();
    });

    it('starts an event type without a config from the defaults and saves a changed frequency', async () => {
        const current = await renderSection([]);
        fake.on('POST', '/events/configs', { ...eventConfig, enabled: true, frequency_minutes: 30 });

        expect(toggle()).toBeChecked();
        expect(frequency()).toHaveValue('60');
        expect(saveButton()).toBeDisabled();

        fireEvent.change(frequency(), { target: { value: '30' } });
        expect(toggle()).toBeChecked();
        expect(frequency()).toHaveValue('30');
        fireEvent.click(saveButton());

        expect(await screen.findByText('common.saved')).toBeInTheDocument();
        expect(fake.last('POST', '/events/configs')?.body).toEqual({
            event_type: 'pan_swap',
            enabled: true,
            frequency_minutes: 30,
            session_key: current.key,
        });
    });

    it('is clean again once the draft is back at what was loaded', async () => {
        await renderSection(eventConfigs);

        fireEvent.click(toggle());
        expect(toggle()).toBeChecked();
        expect(frequency()).toHaveValue('30');
        expect(saveButton()).toBeEnabled();
        fireEvent.change(frequency(), { target: { value: '45' } });
        fireEvent.click(toggle());
        expect(saveButton()).toBeEnabled();

        fireEvent.click(toggle());
        fireEvent.change(frequency(), { target: { value: '30' } });
        fireEvent.click(toggle());
        expect(saveButton()).toBeDisabled();
    });

    it('saves the changed config and shows what the server then lists', async () => {
        let stored = eventConfigs;
        const current = await renderSection(() => stored);
        fake.on('POST', '/events/configs', (request: RecordedRequest) => {
            const body = request.body as { enabled: boolean; frequency_minutes: number };
            const saved = { ...eventConfig, enabled: body.enabled, frequency_minutes: body.frequency_minutes };
            stored = [saved];
            return saved;
        });

        fireEvent.click(toggle());
        fireEvent.change(frequency(), { target: { value: '15' } });
        fireEvent.click(saveButton());

        expect(await screen.findByText('common.saved')).toBeInTheDocument();
        expect(fake.last('POST', '/events/configs')?.body).toEqual({
            event_type: 'pan_swap',
            enabled: true,
            frequency_minutes: 15,
            session_key: current.key,
        });
        await waitFor(() => expect(configFetches()).toBe(2));
        expect(toggle()).toBeChecked();
        expect(frequency()).toHaveValue('15');
        expect(saveButton()).toBeDisabled();
    });

    it('is clean right after saving, before the refetch arrives', async () => {
        let fetches = 0;
        await renderSection(() => (++fetches === 1 ? eventConfigs : new Promise(() => {})));
        fake.on('POST', '/events/configs', { ...eventConfig, enabled: true });

        fireEvent.click(toggle());
        fireEvent.click(saveButton());

        expect(await screen.findByText('common.saved')).toBeInTheDocument();
        expect(toggle()).toBeChecked();
        expect(saveButton()).toBeDisabled();
        fireEvent.click(toggle());
        expect(saveButton()).toBeEnabled();
    });

    it('drops the draft when the configs are refetched with a change', async () => {
        let stored = eventConfigs;
        const current = await renderSection(() => stored);

        fireEvent.click(toggle());
        fireEvent.change(frequency(), { target: { value: '5' } });
        expect(saveButton()).toBeEnabled();

        stored = [{ ...eventConfig, enabled: true, frequency_minutes: 45 }];
        await act(async () => {
            await mutateEventConfigs(current.key);
        });

        expect(toggle()).toBeChecked();
        expect(frequency()).toHaveValue('45');
        expect(saveButton()).toBeDisabled();
    });

    it('keeps the draft when saving fails', async () => {
        await renderSection(eventConfigs);
        fake.on('POST', '/events/configs', () => {
            throw Object.assign(new Error('Request failed with status code 500'), { status: 500 });
        });

        fireEvent.click(toggle());
        fireEvent.click(saveButton());

        expect(await screen.findByText('common.saveFailed')).toBeInTheDocument();
        expect(toggle()).toBeChecked();
        expect(saveButton()).toBeEnabled();
    });
});

it("shows the configs read-only to anyone but the session's creator", async () => {
    useAuthStore.setState({ user: { ...me, id: me.id + 1 } });
    await renderSection([]);

    expect(screen.getByText('settings.onlyCreatorManages')).toBeInTheDocument();
    expect(screen.queryByText('common.save')).not.toBeInTheDocument();
    expect(toggle()).toBeDisabled();
    expect(frequency()).toBeDisabled();
});

it('lets an admin configure any session', async () => {
    useAuthStore.setState({ user: { ...me, id: me.id + 1, is_admin: true } });
    await renderSection(eventConfigs);

    expect(screen.queryByText('settings.onlyCreatorManages')).not.toBeInTheDocument();
    expect(toggle()).toBeEnabled();
    fireEvent.click(toggle());
    expect(saveButton()).toBeEnabled();
});

it('asks for a session without one', () => {
    useAppStore.setState({ session: null });
    renderRoute(<EventSettingsSection />);

    expect(screen.getByText('settings.noSession')).toBeInTheDocument();
    expect(configFetches()).toBe(0);
});
