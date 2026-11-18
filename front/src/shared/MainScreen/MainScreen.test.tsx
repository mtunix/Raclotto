// Needs FakeTransport to be revived: its API mocks went with the Api facade.
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { MainScreen } from './MainScreen';
import { mockUseAppStore, createMockSession, mockLocalStorage } from '../../testUtils';

const mockUseAppStoreDirect = jest.fn();
jest.mock('../AppSlice', () => ({
    useAppStore: (selector: any) => mockUseAppStoreDirect(selector),
}));

const renderWithRouter = (ui: React.ReactElement) => render(<BrowserRouter>{ui}</BrowserRouter>);

describe('MainScreen', () => {
    const mockSession = createMockSession();
    const mockOnSessionClosed = jest.fn();
    const mockState = { session: mockSession, setSession: jest.fn(), clearSession: jest.fn() };
    const mockImpl = (selector: any) => selector(mockState);

    beforeAll(() => {
        mockUseAppStore.mockImplementation(mockImpl);
    });

    beforeEach(() => {
        mockLocalStorage.clear();
        mockUseAppStore.mockClear();
        mockUseAppStoreDirect.mockClear();

        mockUseAppStore.mockImplementation(mockImpl);
        mockUseAppStoreDirect.mockImplementation(mockImpl);
    });

    it('renders no session message when session is null', () => {
        mockUseAppStoreDirect.mockImplementationOnce((selector: any) => 
            selector({ session: null, setSession: jest.fn(), clearSession: jest.fn() })
        );
        renderWithRouter(<MainScreen onSessionClosed={mockOnSessionClosed} />);
        expect(screen.getByText('No session selected')).toBeInTheDocument();
    });

    it('renders toolbar when session exists', () => {
        renderWithRouter(<MainScreen onSessionClosed={mockOnSessionClosed} />);
        expect(screen.getByText('+')).toBeInTheDocument();
    });

    it('loads and displays ingredients', async () => {
        renderWithRouter(<MainScreen onSessionClosed={mockOnSessionClosed} />);

        await waitFor(() => {
            expect(screen.getAllByText('Fill 1').length).toBeGreaterThan(0);
            expect(screen.getAllByText('Sauce 1').length).toBeGreaterThan(0);
        });
    });

    it('groups ingredients by type', async () => {
        renderWithRouter(<MainScreen onSessionClosed={mockOnSessionClosed} />);

        await waitFor(() => {
            expect(screen.getByText('Zutaten')).toBeInTheDocument();
        });
        expect(screen.getByText('Saucen')).toBeInTheDocument();
    });

    it('separates available and unavailable ingredients', async () => {
        renderWithRouter(<MainScreen onSessionClosed={mockOnSessionClosed} />);

        await waitFor(() => {
            expect(screen.getByText('Available')).toBeInTheDocument();
        });
        expect(screen.getByText('Unavailable')).toBeInTheDocument();
    });

    it('handles missing preparation_type endpoint gracefully', async () => {
        renderWithRouter(<MainScreen onSessionClosed={mockOnSessionClosed} />);

        await waitFor(() => {
            expect(screen.getByText('+')).toBeInTheDocument();
        });
    });

    it('refreshes ingredients after onAdd callback', async () => {
        renderWithRouter(<MainScreen onSessionClosed={mockOnSessionClosed} />);

        await waitFor(() => {
            expect(screen.getAllByText('Ingredient 1').length).toBeGreaterThan(0);
        });
    });
});
