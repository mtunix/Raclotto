import { useState } from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useAuthStore } from '../../AuthSlice';
import type { GeneratedPictureDto } from '../../api/generated/model';
import { generatedPicture, me } from '../../lib/api/__fixtures__/backendResponses';
import { FakeTransport } from '../../lib/api/fakeTransport';
import { setTransport, type Transport } from '../../lib/api/transport';
import { renderRoute, settle } from '../../testUtils';
import { LevelUpPictureModal } from './LevelUpPictureModal';

const GENERATE = '/images/generate-profile-picture';
const updatedMe = { ...me, profile_picture: `data:image/png;base64,${generatedPicture.image_base64}` };

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
    fake = new FakeTransport().on('POST', GENERATE, generatedPicture).on('GET', '/auth/me', updatedMe);
    previous = setTransport(fake);
    useAuthStore.setState({ user: me });
});

afterEach(() => {
    setTransport(previous);
});

const generations = () => fake.requests.filter((r) => r.method === 'POST' && r.path === GENERATE);
const picture = () => screen.queryByRole('img', { name: 'image.newAvatarAlt' });
// A closed antd modal stays mounted, hidden.
const spinnerShown = () => {
    const wrap = screen.queryByText('image.generatingMessage')?.closest<HTMLElement>('.ant-modal-wrap');
    return wrap != null && wrap.style.display !== 'none';
};

interface HarnessProps {
    levelId?: number;
    initiallyOpen?: boolean;
    onClose?: () => void;
}

/** The modal as a view drives it: a fresh `onClose` every render, closed by its own `onClose`. */
function Harness({ levelId = 2, initiallyOpen = true, onClose = () => {} }: HarnessProps) {
    const [open, setOpen] = useState(initiallyOpen);
    const [level, setLevel] = useState(levelId);
    const [renders, setRenders] = useState(0);
    return (
        <>
            <button onClick={() => setOpen(true)}>open</button>
            <button onClick={() => setOpen(false)}>close</button>
            <button onClick={() => setRenders(renders + 1)}>rerender</button>
            <button onClick={() => setLevel(level + 1)}>next level</button>
            <p>renders: {renders}</p>
            <LevelUpPictureModal
                open={open}
                levelId={level}
                onClose={() => {
                    setOpen(false);
                    onClose();
                    return renders;
                }}
            />
        </>
    );
}

it("generates the reached level's picture, showing a spinner until it is there", async () => {
    let finish: (picture: GeneratedPictureDto) => void = () => {};
    fake.on('POST', GENERATE, () => new Promise((resolve) => (finish = resolve)));
    renderRoute(<Harness levelId={2} />);

    await waitFor(() => expect(spinnerShown()).toBe(true));
    expect(fake.last('POST', GENERATE)?.body).toEqual({ level_id: 2 });
    expect(picture()).not.toBeInTheDocument();

    finish(generatedPicture);

    expect(await screen.findByRole('img', { name: 'image.newAvatarAlt' })).toHaveAttribute(
        'src',
        `data:${generatedPicture.mime_type};base64,${generatedPicture.image_base64}`,
    );
    expect(screen.getByText('image.yourNewProfilePicture')).toBeInTheDocument();
    expect(spinnerShown()).toBe(false);
});

it('signs the user in with the new picture', async () => {
    renderRoute(<Harness />);

    await screen.findByRole('img', { name: 'image.newAvatarAlt' });

    await waitFor(() => expect(useAuthStore.getState().user).toEqual(updatedMe));
});

it('generates nothing while closed or without a level', async () => {
    renderRoute(
        <>
            <Harness initiallyOpen={false} />
            <LevelUpPictureModal open onClose={() => {}} />
        </>,
    );
    await settle();

    expect(generations()).toHaveLength(0);
});

it('generates once per opened level, however often the view re-renders', async () => {
    let finish: (picture: GeneratedPictureDto) => void = () => {};
    fake.on('POST', GENERATE, () => new Promise((resolve) => (finish = resolve)));
    renderRoute(<Harness />);
    await waitFor(() => expect(generations()).toHaveLength(1));

    fireEvent.click(screen.getByText('rerender'));
    fireEvent.click(screen.getByText('rerender'));
    expect(await screen.findByText('renders: 2')).toBeInTheDocument();
    finish(generatedPicture);
    await screen.findByRole('img', { name: 'image.newAvatarAlt' });
    fireEvent.click(screen.getByText('rerender'));
    await settle();

    expect(generations()).toHaveLength(1);
    expect(picture()).toBeInTheDocument();
});

it('generates again when opened again, or for another level', async () => {
    renderRoute(<Harness levelId={2} />);
    await screen.findByRole('img', { name: 'image.newAvatarAlt' });

    fireEvent.click(screen.getByText('close'));
    fireEvent.click(screen.getByText('open'));
    await waitFor(() => expect(generations()).toHaveLength(2));
    await screen.findByRole('img', { name: 'image.newAvatarAlt' });

    fireEvent.click(screen.getByText('next level'));
    await waitFor(() => expect(generations()).toHaveLength(3));
    expect(generations().map((r) => r.body)).toEqual([{ level_id: 2 }, { level_id: 2 }, { level_id: 3 }]);
    await settle();
});

it('starts a reopened modal from the spinner, without a picture that arrives after it closed', async () => {
    const pending: ((picture: GeneratedPictureDto) => void)[] = [];
    fake.on('POST', GENERATE, () => new Promise((resolve) => pending.push(resolve)));
    renderRoute(<Harness />);
    await waitFor(() => expect(pending).toHaveLength(1));

    fireEvent.click(screen.getByText('close'));
    fireEvent.click(screen.getByText('open'));
    await waitFor(() => expect(pending).toHaveLength(2));
    pending[0](generatedPicture);
    await settle();

    expect(picture()).not.toBeInTheDocument();
    expect(spinnerShown()).toBe(true);

    pending[1](generatedPicture);
    expect(await screen.findByRole('img', { name: 'image.newAvatarAlt' })).toBeInTheDocument();
});

it('closes from the picture, by its button or its close icon', async () => {
    const onClose = vi.fn();
    renderRoute(<Harness onClose={onClose} />);

    await screen.findByRole('img', { name: 'image.newAvatarAlt' });
    fireEvent.click(screen.getByRole('button', { name: 'common.close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(picture()).not.toBeInTheDocument());

    fireEvent.click(screen.getByText('open'));
    const shown = await screen.findByRole('img', { name: 'image.newAvatarAlt' });
    fireEvent.click(within(shown.closest('.ant-modal') as HTMLElement).getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
});

it('says the picture failed and closes', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fake.on('POST', GENERATE, () => {
        throw Object.assign(new Error('Request failed with status code 503'), { status: 503 });
    });
    const onClose = vi.fn();
    renderRoute(<Harness onClose={onClose} />);

    expect(await screen.findByText('image.profilePictureError')).toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(spinnerShown()).toBe(false));
    expect(generations()).toHaveLength(1);
});
