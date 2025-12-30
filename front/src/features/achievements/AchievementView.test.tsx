import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AchievementView } from './AchievementView';
import { mockApi, createMockAchievement, resetAllMocks } from '../../testUtils';

describe('AchievementView', () => {
    beforeEach(() => {
        resetAllMocks();
        mockApi.get.mockResolvedValue([]);
    });

    it('renders loading spinner initially', () => {
        mockApi.get.mockImplementation(() => new Promise(() => {}));
        render(<AchievementView />);
        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('displays achievements after API call', async () => {
        const achievements = [
            createMockAchievement({ id: 1, title: 'First Achievement', description: 'First Description' }),
            createMockAchievement({ id: 2, title: 'Second Achievement', description: 'Second Description' }),
        ];
        mockApi.get.mockResolvedValue(achievements);

        render(<AchievementView />);

        await waitFor(() => {
            expect(screen.queryByRole('status')).not.toBeInTheDocument();
        });

        expect(screen.getByText('First Achievement')).toBeInTheDocument();
        expect(screen.getByText('Second Achievement')).toBeInTheDocument();
    });

    it('shows achievement descriptions', async () => {
        const achievements = [createMockAchievement({ id: 1, title: 'Test Achievement', description: 'Test Description' })];
        mockApi.get.mockResolvedValue(achievements);

        render(<AchievementView />);

        await waitFor(() => {
            expect(screen.getByText('Test Description')).toBeInTheDocument();
        });
    });

    it('handles empty achievements list', async () => {
        render(<AchievementView />);

        await waitFor(() => {
            expect(screen.queryByRole('status')).not.toBeInTheDocument();
        });

        expect(screen.queryByText(/achievement/i)).not.toBeInTheDocument();
    });

    it('calls API.get with correct endpoint', async () => {
        mockApi.get.mockResolvedValue([createMockAchievement()]);
        render(<AchievementView />);

        await waitFor(() => {
            expect(mockApi.get).toHaveBeenCalledWith('achievements');
        });
    });
});
