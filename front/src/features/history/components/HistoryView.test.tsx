// Needs FakeTransport to be revived: its API mocks went with the Api facade.
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { HistoryView } from './HistoryView';
import { createMockPan, createMockIngredient, mockAuthor, resetAllMocks } from '../../../testUtils';
import { IngredientType } from '../../../api/generated/model';

describe('HistoryView', () => {
    const sessionKey = 'test-session';
    const mockIngredients = [
        createMockIngredient({ id: 1, name: 'Ingredient 1', type: IngredientType.FILL }),
        createMockIngredient({ id: 2, name: 'Sauce 1', type: IngredientType.SAUCE }),
    ];

    beforeEach(() => {
        resetAllMocks();
    });

    it('renders loading spinner initially', () => {
        render(<HistoryView />);
        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('displays pan history after API call', async () => {
        const pans = [
            createMockPan({ id: 1, name: 'Pan 1', author: { ...mockAuthor, name: 'User 1' } }),
            createMockPan({ id: 2, name: 'Pan 2', author: { ...mockAuthor, name: 'User 2' } }),
        ];

        render(<HistoryView />);

        await waitFor(() => {
            expect(screen.queryByRole('status')).not.toBeInTheDocument();
        });

        expect(screen.getByText('Pan 1')).toBeInTheDocument();
        expect(screen.getByText('Pan 2')).toBeInTheDocument();
    });

    it('shows pan details with ingredients', async () => {
        const pan = createMockPan({
            id: 1,
            name: 'Test Pan',
            ingredients: [
                createMockIngredient({ id: 1, name: 'Fill Ingredient', type: IngredientType.FILL }),
                createMockIngredient({ id: 2, name: 'Sauce Ingredient', type: IngredientType.SAUCE }),
            ],
        });

        render(<HistoryView />);

        await waitFor(() => {
            expect(screen.getByText('Test Pan')).toBeInTheDocument();
        });

        expect(screen.getByText('Fill Ingredient')).toBeInTheDocument();
        expect(screen.getByText('Sauce Ingredient')).toBeInTheDocument();
    });

    it('displays pan metadata', async () => {
        const pan = createMockPan({
            id: 1,
            name: 'Test Pan',
            timestamp: '2024-01-01T12:00:00Z',
        });

        render(<HistoryView />);

        await waitFor(() => {
            expect(screen.getByText(/Test User/)).toBeInTheDocument();
            expect(screen.getByText(/2024-01-01T12:00:00Z/)).toBeInTheDocument();
        });
    });

    it('shows rating component for each pan', async () => {
        render(<HistoryView />);

        await waitFor(() => {
            expect(screen.getAllByRole('radio').length).toBeGreaterThan(0);
        });
    });

    it('displays ingredient tags', async () => {
        const pan = createMockPan({
            id: 1,
            ingredients: [
                createMockIngredient({
                    id: 1,
                    name: 'Test Ingredient',
                    type: IngredientType.FILL,
                    meat: true,
                    vegan: true,
                }),
            ],
        });

        render(<HistoryView />);

        await waitFor(() => {
            expect(screen.getByText('tags.meat')).toBeInTheDocument();
            expect(screen.getByText('tags.vegan')).toBeInTheDocument();
        });
    });

    it('handles empty pan history', async () => {
        render(<HistoryView />);

        await waitFor(() => {
            expect(screen.queryByRole('status')).not.toBeInTheDocument();
        });

        expect(screen.queryByText(/pan/i)).not.toBeInTheDocument();
    });

    it('reverses pan order', async () => {
        const pans = [
            createMockPan({ id: 1, name: 'First Pan' }),
            createMockPan({ id: 2, name: 'Second Pan' }),
        ];

        render(<HistoryView />);

        await waitFor(() => {
            const panElements = screen.getAllByText(/Pan/);
            expect(panElements[0]).toHaveTextContent('Second Pan');
            expect(panElements[1]).toHaveTextContent('First Pan');
        });
    });
});
