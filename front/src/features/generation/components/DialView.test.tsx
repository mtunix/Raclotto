import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DialView } from './DialView';
import { createMockIngredient, resetAllMocks } from '../../../components/__tests__/testUtils';
import { IngredientType } from '../../../model/ingredient';

describe('DialView', () => {
    const mockOnChange = jest.fn();
    const mockIngredients = [
        createMockIngredient({ id: 1, name: 'Ingredient 1', type: IngredientType.FILL }),
        createMockIngredient({ id: 2, name: 'Ingredient 2', type: IngredientType.FILL }),
        createMockIngredient({ id: 3, name: 'Ingredient 3', type: IngredientType.FILL }),
    ];

    beforeEach(() => {
        resetAllMocks();
        mockOnChange.mockClear();
    });

    it('renders with initial value', () => {
        render(<DialView num={1} ingredients={mockIngredients} onChange={mockOnChange} />);
        expect(screen.getByRole('spinbutton')).toHaveValue(1);
    });

    it('increments value when plus button is clicked', async () => {
        const user = userEvent.setup();
        render(<DialView num={1} ingredients={mockIngredients} onChange={mockOnChange} />);
        await user.click(screen.getByText('+'));
        expect(mockOnChange).toHaveBeenCalledWith(2);
    });

    it('decrements value when minus button is clicked', async () => {
        const user = userEvent.setup();
        render(<DialView num={2} ingredients={mockIngredients} onChange={mockOnChange} />);
        await user.click(screen.getByText('-'));
        expect(mockOnChange).toHaveBeenCalledWith(1);
    });

    it('does not decrement below 1', async () => {
        const user = userEvent.setup();
        render(<DialView num={1} ingredients={mockIngredients} onChange={mockOnChange} />);
        await user.click(screen.getByText('-'));
        expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('does not increment above ingredients length', async () => {
        const user = userEvent.setup();
        render(<DialView num={3} ingredients={mockIngredients} onChange={mockOnChange} />);
        await user.click(screen.getByText('+'));
        expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('updates value when input is changed', async () => {
        const user = userEvent.setup();
        render(<DialView num={1} ingredients={mockIngredients} onChange={mockOnChange} />);
        const input = screen.getByRole('spinbutton');
        await user.clear(input);
        await user.type(input, '2');

        await waitFor(() => {
            expect(mockOnChange).toHaveBeenCalled();
        });
        expect(typeof mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]).toBe('number');
    });

    it('shows error styling when value is out of range', () => {
        render(<DialView num={0} ingredients={mockIngredients} onChange={mockOnChange} />);
        expect(screen.getByRole('spinbutton')).toHaveStyle({ borderColor: '#ff4d4f' });
    });

    it('updates when num prop changes', () => {
        const { rerender } = render(<DialView num={1} ingredients={mockIngredients} onChange={mockOnChange} />);
        expect(screen.getByRole('spinbutton')).toHaveValue(1);
        rerender(<DialView num={2} ingredients={mockIngredients} onChange={mockOnChange} />);
        expect(screen.getByRole('spinbutton')).toHaveValue(2);
    });

    it('handles null input value', async () => {
        const user = userEvent.setup();
        render(<DialView num={1} ingredients={mockIngredients} onChange={mockOnChange} />);
        await user.clear(screen.getByRole('spinbutton'));
        expect(mockOnChange).toHaveBeenCalledWith(1);
    });
});
