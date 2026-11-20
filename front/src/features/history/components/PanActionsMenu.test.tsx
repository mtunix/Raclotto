import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useAuthStore } from '../../../AuthSlice';
import { ApiErrorCode, type PanDto } from '../../../api/generated/model';
import { me, panPage } from '../../../lib/api/__fixtures__/backendResponses';
import { FakeTransport } from '../../../lib/api/fakeTransport';
import { setTransport, type Transport } from '../../../lib/api/transport';
import { renderRoute } from '../../../testUtils';
import { PanActionsMenu } from './PanActionsMenu';

const own: PanDto = { ...panPage.items[0], user_id: me.id, name: 'Friday Pan' };
const path = `/pans/${own.id}`;
const deletes = () => fake.requests.filter((r) => r.method === 'DELETE');
const answered = (status: number, code: ApiErrorCode) =>
    Object.assign(new Error(`Request failed with status code ${status}`), {
        response: { status, data: { errors: [{ code, status, title: 'x', detail: 'x', id_: 'x', source: null }] } },
    });

let fake: FakeTransport;
let previous: Transport;
let onDeleted: ReturnType<typeof vi.fn<(panId: number) => void>>;

beforeEach(() => {
    fake = new FakeTransport().on('DELETE', path, undefined);
    previous = setTransport(fake);
    onDeleted = vi.fn<(panId: number) => void>();
    useAuthStore.setState({ user: me });
});

afterEach(() => {
    setTransport(previous);
});

function renderMenu(pan: PanDto = own) {
    renderRoute(<PanActionsMenu pan={pan} onDeleted={onDeleted} />);
}

async function openConfirm(): Promise<HTMLElement> {
    fireEvent.click(screen.getByRole('button', { name: 'history.panActions' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /history.deletePan/ }));
    return screen.findByRole('dialog');
}

const button = (dialog: HTMLElement, name: string) => within(dialog).getByRole('button', { name });

it('shows nothing on a pan someone else rolled, not even to an admin', () => {
    const others = { ...own, user_id: me.id + 1 };
    renderMenu(others);
    expect(screen.queryByRole('button', { name: 'history.panActions' })).not.toBeInTheDocument();

    act(() => useAuthStore.setState({ user: { ...me, is_admin: true } }));
    renderMenu(others);
    expect(screen.queryByRole('button', { name: 'history.panActions' })).not.toBeInTheDocument();
});

it('asks before deleting, naming the pan and what goes with it, with Cancel focused', async () => {
    renderMenu();

    const dialog = await openConfirm();

    expect(dialog).toHaveTextContent('history.deleteConfirmTitle');
    expect(dialog).toHaveTextContent('history.deleteConfirmMessage');
    expect(button(dialog, 'history.deleteConfirm')).toHaveClass('ant-btn-dangerous');
    await waitFor(() => expect(button(dialog, 'common.cancel')).toHaveFocus());
    expect(deletes()).toEqual([]);
});

it('sends nothing on Cancel, Enter or a click on the mask', async () => {
    renderMenu();
    const dialog = await openConfirm();
    await waitFor(() => expect(button(dialog, 'common.cancel')).toHaveFocus());

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Enter' });
    fireEvent.click(document.querySelector('.ant-modal-wrap') as HTMLElement);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(button(dialog, 'common.cancel'));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(deletes()).toEqual([]);
    expect(onDeleted).not.toHaveBeenCalled();
});

it('deletes once on confirm, however often it is clicked, and reports the pan gone', async () => {
    let answer: () => void = () => {};
    fake.on('DELETE', path, () => new Promise<void>((resolve) => (answer = resolve)));
    renderMenu();
    const dialog = await openConfirm();
    const confirm = button(dialog, 'history.deleteConfirm');

    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await waitFor(() => expect(confirm).toHaveClass('ant-btn-loading'));
    fireEvent.click(confirm);
    answer();

    expect(await screen.findByText('history.panDeleted')).toBeInTheDocument();
    expect(deletes()).toHaveLength(1);
    expect(onDeleted).toHaveBeenCalledWith(own.id);
});

it("shows what the backend's error code says, and keeps the pan", async () => {
    fake.on('DELETE', path, () => {
        throw answered(403, ApiErrorCode.forbidden);
    });
    renderMenu();
    const dialog = await openConfirm();

    fireEvent.click(button(dialog, 'history.deleteConfirm'));

    expect(await screen.findByText(`apiError.${ApiErrorCode.forbidden}`)).toBeInTheDocument();
    expect(onDeleted).not.toHaveBeenCalled();
});
