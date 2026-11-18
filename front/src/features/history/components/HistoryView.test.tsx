// Needs FakeTransport to be revived: its API mocks went with the Api facade.
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { HistoryView } from './HistoryView';
import { resetAllMocks } from '../../../testUtils';

describe('HistoryView', () => {
    beforeEach(() => {
        resetAllMocks();
    });

    it('renders loading spinner initially', () => {
        render(<HistoryView />);
        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('displays pan history after API call', async () => {
        render(<HistoryView />);

        await waitFor(() => {
            expect(screen.queryByRole('status')).not.toBeInTheDocument();
        });

        expect(screen.getByText('Pan 1')).toBeInTheDocument();
        expect(screen.getByText('Pan 2')).toBeInTheDocument();
    });

    it('shows pan details with ingredients', async () => {
        render(<HistoryView />);

        await waitFor(() => {
            expect(screen.getByText('Test Pan')).toBeInTheDocument();
        });

        expect(screen.getByText('Fill Ingredient')).toBeInTheDocument();
        expect(screen.getByText('Sauce Ingredient')).toBeInTheDocument();
    });

    it('displays pan metadata', async () => {
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
        render(<HistoryView />);

        await waitFor(() => {
            const panElements = screen.getAllByText(/Pan/);
            expect(panElements[0]).toHaveTextContent('Second Pan');
            expect(panElements[1]).toHaveTextContent('First Pan');
        });
    });
});
