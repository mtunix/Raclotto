import { fireEvent, screen, within } from '@testing-library/react';
import { useAppStore } from '../../../AppSlice';
import { ingredient, session } from '../../../lib/api/__fixtures__/backendResponses';
import { FakeTransport } from '../../../lib/api/fakeTransport';
import { setTransport, type Transport } from '../../../lib/api/transport';
import { renderRoute } from '../../../testUtils';
import { AddIngredientModal } from './AddIngredientModal';

let fake: FakeTransport;
let previous: Transport;

beforeEach(() => {
    fake = new FakeTransport().on('POST', '/ingredients', ingredient);
    previous = setTransport(fake);
    useAppStore.setState({ session });
});

afterEach(() => {
    setTransport(previous);
});

it('closes once after creating', async () => {
    const onCancel = vi.fn();
    const onSuccess = vi.fn();
    renderRoute(<AddIngredientModal visible onCancel={onCancel} onSuccess={onSuccess} />);
    const dialog = screen.getByRole('dialog');

    fireEvent.change(within(dialog).getByPlaceholderText('common.enterName'), { target: { value: 'Corn' } });
    fireEvent.click(within(dialog).getByText('common.create'));

    expect(await screen.findByText('ingredient.added')).toBeInTheDocument();
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
});
