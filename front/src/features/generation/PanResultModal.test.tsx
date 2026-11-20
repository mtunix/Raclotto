import { useState } from 'react';
import { act, fireEvent, screen, within } from '@testing-library/react';
import type { PanDto } from '../../api/generated/model';
import { rollOutcome } from '../../lib/api/__fixtures__/backendResponses';
import { renderRoute } from '../../testUtils';
import { PanResultModal } from './PanResultModal';

const { pan } = rollOutcome;
// Fills reveal before sauces, whatever order the pan lists them in.
const sauceFirst: PanDto = { ...pan, ingredients: [pan.ingredients[2], pan.ingredients[0], pan.ingredients[1]] };
const REVEAL_STEP_MS = 150;

afterEach(() => {
    vi.useRealTimers();
});

interface HarnessProps {
    initialPan?: PanDto | null;
    rollCheese?: boolean;
    hasLeveledUp?: boolean;
    onClose?: () => void;
    onRating?: (rating: number) => void;
}

/** The modal as a view uses it: closing it closes it, and the view can reopen it or show another pan. */
function Harness({ initialPan = pan, rollCheese = false, hasLeveledUp, onClose = () => {}, onRating = () => {} }: HarnessProps) {
    const [open, setOpen] = useState(true);
    const [shown, setShown] = useState(initialPan);
    return (
        <>
            <button onClick={() => setOpen(true)}>reopen</button>
            <button onClick={() => setShown({ ...pan, id: pan.id + 1, name: 'Another pan' })}>another</button>
            <PanResultModal
                open={open}
                pan={shown}
                rollCheese={rollCheese}
                hasLeveledUp={hasLeveledUp}
                onRating={onRating}
                onClose={() => {
                    setOpen(false);
                    onClose();
                }}
            />
        </>
    );
}

/** The ingredients revealed so far, in the order they are shown. */
function revealed(): string[] {
    const names = pan.ingredients.map((ingredient) => ingredient.name ?? '');
    return [...document.querySelectorAll('[class*="slotMachineItem"]')]
        .filter((slot) => /slotVisible/.test(slot.className))
        .map((slot) => names.find((name) => slot.textContent?.includes(name)) ?? '');
}

const dialog = () => screen.getByRole('dialog');

async function advance(ms: number) {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
    });
}

function renderModal(props: HarnessProps = {}) {
    vi.useFakeTimers();
    renderRoute(<Harness {...props} />);
}

it('shows nothing without a pan', () => {
    renderRoute(<PanResultModal open pan={null} rollCheese onClose={() => {}} onRating={() => {}} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it("shows the pan's name and preparation type, and says so after a level-up", async () => {
    renderModal({ hasLeveledUp: true });
    await advance(0);

    expect(within(dialog()).getByText(pan.name as string)).toBeInTheDocument();
    expect(within(dialog()).getByText(pan.preparation_type?.name as string)).toBeInTheDocument();
    expect(within(dialog()).getByText(/level\.leveledUp/)).toBeInTheDocument();
});

it('names an unnamed pan as such and has no level-up banner without one', async () => {
    renderModal({ initialPan: { ...pan, name: null } });
    await advance(0);

    expect(within(dialog()).getByText('common.unnamed')).toBeInTheDocument();
    expect(within(dialog()).queryByText(/level\.leveledUp/)).not.toBeInTheDocument();
});

it('shows the rolled cheese when cheese was rolled', async () => {
    renderModal({ rollCheese: true });
    await advance(0);

    expect(within(dialog()).getByRole('slider')).toBeInTheDocument();
});

it('shows no cheese when none was rolled', async () => {
    renderModal({ rollCheese: false });
    await advance(0);

    expect(within(dialog()).queryByRole('slider')).not.toBeInTheDocument();
});

it('reveals the fills, then the sauces, one at a time', async () => {
    renderModal({ initialPan: sauceFirst });

    await advance(0);
    expect(revealed()).toEqual(['Potato']);
    await advance(REVEAL_STEP_MS);
    expect(revealed()).toEqual(['Potato', 'Pork']);
    await advance(REVEAL_STEP_MS);
    expect(revealed()).toEqual(['Potato', 'Pork', 'Aioli']);
});

it('starts the reveal over when reopened, without the reveal it closed during', async () => {
    renderModal();
    await advance(REVEAL_STEP_MS);
    expect(revealed()).toEqual(['Potato', 'Pork']);

    fireEvent.click(within(dialog()).getByRole('button', { name: 'common.close' }));
    await advance(10);
    fireEvent.click(screen.getByText('reopen'));
    await advance(0);
    expect(revealed()).toEqual(['Potato']);

    // The closed reveal would show the sauce now.
    await advance(REVEAL_STEP_MS - 10 + 1);
    expect(revealed()).toEqual(['Potato']);
    await advance(10);
    expect(revealed()).toEqual(['Potato', 'Pork']);
    await advance(REVEAL_STEP_MS);
    expect(revealed()).toEqual(['Potato', 'Pork', 'Aioli']);
});

it('reveals another pan from the start', async () => {
    renderModal();
    await advance(2 * REVEAL_STEP_MS);
    expect(revealed()).toHaveLength(3);

    fireEvent.click(screen.getByText('another'));
    await advance(0);

    expect(within(dialog()).getByText('Another pan')).toBeInTheDocument();
    expect(revealed()).toEqual(['Potato']);
});

it('leaves no reveal running once unmounted', async () => {
    vi.useFakeTimers();
    const { unmount } = renderRoute(<PanResultModal open pan={pan} rollCheese={false} onClose={() => {}} onRating={() => {}} />);
    await advance(0);
    expect(revealed()).toEqual(['Potato']);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
});

it('reports the stars given', async () => {
    const onRating = vi.fn();
    renderModal({ onRating });
    await advance(0);

    const fourthStar = within(dialog()).getAllByRole('radio')[3];
    fireEvent.click(fourthStar.querySelector('.ant-rate-star-second') as HTMLElement);

    expect(onRating).toHaveBeenCalledWith(4);
});

it('closes from its button and its close icon', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    await advance(0);

    fireEvent.click(within(dialog()).getByRole('button', { name: 'common.close' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('reopen'));
    await advance(0);
    fireEvent.click(within(dialog().closest('.ant-modal') as HTMLElement).getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
});
