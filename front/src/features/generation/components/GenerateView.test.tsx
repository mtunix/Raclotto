import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GenerateView } from './GenerateView';
import { mockApi, createMockIngredient, createMockPan, resetAllMocks, mockLocalStorage } from '../../../components/__tests__/testUtils';
import { IngredientType } from '../../../model/ingredient';

describe('GenerateView', () => {
    const sessionKey = 'test-session';
    const mockOnGeneration = jest.fn();
    const allIngredients = [
        createMockIngredient({ id: 1, name: 'Fill 1', type: IngredientType.FILL }),
        createMockIngredient({ id: 2, name: 'Fill 2', type: IngredientType.FILL }),
        createMockIngredient({ id: 3, name: 'Sauce 1', type: IngredientType.SAUCE }),
        createMockIngredient({ id: 4, name: 'Sauce 2', type: IngredientType.SAUCE }),
    ];

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
        mockApi.generate.mockImplementation(() => new Promise(() => {}));

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
        const generatedPan = createMockPan({
            id: 1,
            name: 'Generated Pan',
            ingredients: [
                createMockIngredient({ id: 1, name: 'Ingredient 1', type: IngredientType.FILL }),
                createMockIngredient({ id: 2, name: 'Sauce 1', type: IngredientType.SAUCE }),
            ],
        });
        mockApi.generate.mockResolvedValue({ generated: generatedPan });

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
        mockApi.generate.mockResolvedValue({ generated: createMockPan() });

        render(<GenerateView />);

        await waitFor(() => {
            expect(screen.getByText('common.create')).not.toBeDisabled();
        });

        await user.click(screen.getByText('common.create'));

        await waitFor(() => {
            expect(mockApi.generate).toHaveBeenCalledWith(sessionKey, 2, 1);
            expect(mockOnGeneration).toHaveBeenCalledWith(2, 1);
        });
    });

    it('saves counts to localStorage on generate', async () => {
        const user = userEvent.setup();
        setupLocalStorage('2', '1');
        mockApi.generate.mockResolvedValue({ generated: createMockPan() });

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
        mockApi.generate.mockResolvedValue({ generated: createMockPan({ id: 1, rating: 0 }) });

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
        mockApi.generate.mockResolvedValue({ generated: createMockPan() });

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
