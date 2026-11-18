// Needs FakeTransport to be revived: its API mocks went with the Api facade.
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GenerateView } from './GenerateView';
import { resetAllMocks, mockLocalStorage } from '../../../testUtils';

describe('GenerateView', () => {
    const mockOnGeneration = jest.fn();

    const setupLocalStorage = (fill: string, sauce: string) => {
        mockLocalStorage.getItem.mockImplementation((key: string) => {
            if (key === 'numFill') return fill;
            if (key === 'numSauce') return sauce;
            return null;
        });
    };

    beforeEach(() => {
        resetAllMocks();
        mockOnGeneration.mockClear();
        mockLocalStorage.clear();
    });

    it('renders dial views for fill and sauce counts', () => {
        render(<GenerateView />);
        expect(screen.getByText('ingredient.ingredientCount')).toBeInTheDocument();
        expect(screen.getByText('ingredient.sauceCount')).toBeInTheDocument();
    });

    it('loads counts from localStorage', () => {
        setupLocalStorage('2', '1');
        render(<GenerateView />);
        const inputs = screen.getAllByRole('spinbutton');
        expect(inputs[0]).toHaveValue(2);
        expect(inputs[1]).toHaveValue(1);
    });

    it('disables generate button when counts are invalid', async () => {
        const user = userEvent.setup();
        mockLocalStorage.getItem.mockReturnValue(null);
        render(<GenerateView />);

        await waitFor(() => {
            expect(screen.getAllByRole('spinbutton')[0]).toBeInTheDocument();
        });

        const fillInput = screen.getAllByRole('spinbutton')[0];
        await user.clear(fillInput);
        await user.type(fillInput, '0');
        expect(screen.getByText('common.create')).toBeDisabled();
    });

    it('enables generate button when counts are valid', async () => {
        setupLocalStorage('1', '1');
        render(<GenerateView />);

        await waitFor(() => {
            expect(screen.getByText('common.create')).not.toBeDisabled();
        });
    });

    it('shows loading state during generation', async () => {
        const user = userEvent.setup();
        setupLocalStorage('1', '1');

        render(<GenerateView />);

        await waitFor(() => {
            expect(screen.getByText('common.create')).not.toBeDisabled();
        });

        await user.click(screen.getByText('common.create'));

        await waitFor(() => {
            expect(screen.getByRole('status')).toBeInTheDocument();
        });
    });

    it('displays generated pan after successful generation', async () => {
        const user = userEvent.setup();
        setupLocalStorage('1', '1');

        render(<GenerateView />);

        await waitFor(() => {
            expect(screen.getByText('common.create')).not.toBeDisabled();
        });

        await user.click(screen.getByText('common.create'));

        await waitFor(() => {
            expect(screen.getByText('Generated Pan')).toBeInTheDocument();
        });

        expect(screen.getByText('Ingredient 1')).toBeInTheDocument();
        expect(screen.getByText('Sauce 1')).toBeInTheDocument();
    });

    it('calls API.generate and onGeneration with correct parameters', async () => {
        const user = userEvent.setup();
        setupLocalStorage('2', '1');

        render(<GenerateView />);

        await waitFor(() => {
            expect(screen.getByText('common.create')).not.toBeDisabled();
        });

        await user.click(screen.getByText('common.create'));

        await waitFor(() => {
            expect(mockOnGeneration).toHaveBeenCalledWith(2, 1);
        });
    });

    it('saves counts to localStorage on generate', async () => {
        const user = userEvent.setup();
        setupLocalStorage('2', '1');

        render(<GenerateView />);

        await waitFor(() => {
            expect(screen.getByText('common.create')).not.toBeDisabled();
        });

        await user.click(screen.getByText('common.create'));

        await waitFor(() => {
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('numFill', '2');
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('numSauce', '1');
        });
    });

    it('shows rating component for generated pan', async () => {
        const user = userEvent.setup();
        setupLocalStorage('1', '1');

        render(<GenerateView />);

        await waitFor(() => {
            expect(screen.getByText('common.create')).not.toBeDisabled();
        });

        await user.click(screen.getByText('common.create'));

        await waitFor(() => {
            expect(screen.getAllByRole('radio').length).toBeGreaterThan(0);
        });
    });

    it('restarts generation when roll another dice is clicked', async () => {
        const user = userEvent.setup();
        setupLocalStorage('1', '1');

        render(<GenerateView />);

        await waitFor(() => {
            expect(screen.getByText('common.create')).not.toBeDisabled();
        });

        await user.click(screen.getByText('common.create'));

        await waitFor(() => {
            expect(screen.getByText('generate.rollAnotherDice')).toBeInTheDocument();
        });

        await user.click(screen.getByText('generate.rollAnotherDice'));

        await waitFor(() => {
            expect(screen.queryByText('generate.rollAnotherDice')).not.toBeInTheDocument();
            expect(screen.getByText('common.create')).toBeInTheDocument();
        });
    });
});
