import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddIngredient } from './AddIngredient';
import { mockApi, resetAllMocks } from './__tests__/testUtils';
import { IngredientType } from '../model/ingredient';

describe('AddIngredient', () => {
    const mockOnAdd = jest.fn();
    const sessionKey = 'test-session';

    beforeEach(() => {
        resetAllMocks();
        mockApi.add.mockResolvedValue({});
    });

    it('renders form fields', () => {
        render(<AddIngredient />);
        expect(screen.getByPlaceholderText('common.enterName')).toBeInTheDocument();
        expect(screen.getByText('ingredient.type')).toBeInTheDocument();
        expect(screen.getByText('ingredient.contains')).toBeInTheDocument();
    });

    it('disables submit button when name is empty', () => {
        render(<AddIngredient />);
        expect(screen.getByText('common.create')).toBeDisabled();
    });

    it('enables submit button when name is entered', async () => {
        const user = userEvent.setup();
        render(<AddIngredient />);
        await user.type(screen.getByPlaceholderText('common.enterName'), 'Test Ingredient');
        expect(screen.getByText('common.create')).not.toBeDisabled();
    });

    it('calls API.add with correct data on submit', async () => {
        const user = userEvent.setup();
        render(<AddIngredient />);
        await user.type(screen.getByPlaceholderText('common.enterName'), 'Test Ingredient');
        await user.click(screen.getByText('common.create'));

        await waitFor(() => {
            expect(mockApi.add).toHaveBeenCalledWith(sessionKey, expect.objectContaining({
                name: 'Test Ingredient',
                type: IngredientType.FILL,
                vegetarian: true,
            }));
        });
    });

    it('resets form after successful submission', async () => {
        const user = userEvent.setup();
        render(<AddIngredient />);
        const nameInput = screen.getByPlaceholderText('common.enterName');
        await user.type(nameInput, 'Test Ingredient');
        await user.click(screen.getByText('common.create'));

        await waitFor(() => {
            expect(nameInput).toHaveValue('');
        });
    });

    it('calls onAdd callback after successful submission', async () => {
        const user = userEvent.setup();
        render(<AddIngredient />);
        await user.type(screen.getByPlaceholderText('common.enterName'), 'Test Ingredient');
        await user.click(screen.getByText('common.create'));

        await waitFor(() => {
            expect(mockOnAdd).toHaveBeenCalled();
        });
    });

    it('toggles tag switches', async () => {
        const user = userEvent.setup();
        render(<AddIngredient />);
        const switches = screen.getAllByRole('switch');
        const meatSwitch = switches.find((sw) => sw.getAttribute('aria-checked') === 'false');
        if (meatSwitch) {
            await user.click(meatSwitch);
            expect(meatSwitch).toHaveAttribute('aria-checked', 'true');
        }
    });

    it('changes ingredient type selection', async () => {
        const user = userEvent.setup();
        render(<AddIngredient />);
        const sauceRadio = screen.getByLabelText('ingredient.sauce');
        await user.click(sauceRadio);
        expect(sauceRadio).toBeChecked();
    });
});
