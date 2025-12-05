import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServerSettingsView } from './ServerSettingsView';
import { mockApi, resetAllMocks } from './__tests__/testUtils';

describe('ServerSettingsView', () => {
    const sessionKey = 'test-session';
    const mockOnSessionClosed = jest.fn();
    const sessionData = { session: { name: 'Test Session' } };

    beforeEach(() => {
        resetAllMocks();
        mockApi.get.mockResolvedValue(sessionData);
        mockApi.close.mockResolvedValue({});
    });

    it('renders loading spinner initially', () => {
        mockApi.get.mockImplementation(() => new Promise(() => {}));
        render(<ServerSettingsView session={sessionKey} onSessionClosed={mockOnSessionClosed} />);
        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('loads and displays session name', async () => {
        render(<ServerSettingsView session={sessionKey} onSessionClosed={mockOnSessionClosed} />);
        await waitFor(() => {
            expect(screen.queryByRole('status')).not.toBeInTheDocument();
        });
        expect(screen.getByPlaceholderText('common.enterName')).toHaveValue('Test Session');
    });

    it('updates session name when input changes', async () => {
        const user = userEvent.setup();
        render(<ServerSettingsView session={sessionKey} onSessionClosed={mockOnSessionClosed} />);
        await waitFor(() => {
            expect(screen.queryByRole('status')).not.toBeInTheDocument();
        });

        const nameInput = screen.getByPlaceholderText('common.enterName');
        await user.clear(nameInput);
        await user.type(nameInput, 'Updated Session');
        expect(nameInput).toHaveValue('Updated Session');
    });

    it('calls API.close and onSessionClosed when close button is clicked', async () => {
        const user = userEvent.setup();
        render(<ServerSettingsView session={sessionKey} onSessionClosed={mockOnSessionClosed} />);
        await waitFor(() => {
            expect(screen.queryByRole('status')).not.toBeInTheDocument();
        });

        await user.click(screen.getByText('session.endSession'));

        await waitFor(() => {
            expect(mockApi.close).toHaveBeenCalledWith(sessionKey);
            expect(mockOnSessionClosed).toHaveBeenCalled();
        });
    });

    it('calls API.get with correct parameters', async () => {
        render(<ServerSettingsView session={sessionKey} onSessionClosed={mockOnSessionClosed} />);
        await waitFor(() => {
            expect(mockApi.get).toHaveBeenCalledWith('session', sessionKey);
        });
    });
});
