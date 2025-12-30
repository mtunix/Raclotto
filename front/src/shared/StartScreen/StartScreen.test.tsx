import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { StartScreen, JoinSession, SessionSelector } from './StartScreen';
import { mockApi, mockUseAppStore, createMockIngredient, createMockSession, resetAllMocks, mockLocalStorage } from '../../testUtils';
import { RaclottoSession } from '../../model/raclottoSession';

const mockUseSessions: jest.Mock<{ data?: RaclottoSession[]; isLoading: boolean; error: Error | null }> = jest.fn(() => ({ data: [], isLoading: false, error: null }));
jest.mock('../lib/api/apiSession', () => ({
    useSessions: () => mockUseSessions(),
}));

jest.mock('react-router', () => ({
    ...jest.requireActual('react-router'),
    useNavigate: () => jest.fn(),
}));

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useRouteError: () => null,
}));

jest.mock('i18next', () => ({
    t: (key: string) => key,
}));

const mockUseAppStoreStartScreen = jest.fn();
jest.mock('../AppSlice', () => ({
    useAppStore: (selector: any) => mockUseAppStoreStartScreen(selector),
}));

describe('StartScreen', () => {
    beforeEach(() => {
        resetAllMocks();
        mockUseAppStoreStartScreen.mockImplementation((selector: any) => 
            selector({ session: null, setSession: jest.fn(), clearSession: jest.fn() })
        );
    });

    it('renders session joined message when session exists', () => {
        const mockSession = createMockSession({ name: 'Test Session' });
        mockUseAppStoreStartScreen.mockImplementation((selector: any) => 
            selector({ session: mockSession, setSession: jest.fn(), clearSession: jest.fn() })
        );
        mockUseSessions.mockReturnValue({ data: [], isLoading: false, error: null });

        render(<StartScreen />);
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading.textContent).toMatch(/Session.*Test Session.*beigetreten/i);
    });

    it('renders session selector when no session', () => {
        mockUseAppStore.mockImplementation((selector: any) => selector({ session: null }));
        mockUseSessions.mockReturnValueOnce({ data: [], isLoading: false, error: null });
        render(<StartScreen />);
        expect(screen.getByText('Neue Session erstellen')).toBeInTheDocument();
    });
});

describe('JoinSession', () => {
    beforeEach(() => {
        resetAllMocks();
    });

    it('renders loading spinner when loading', () => {
        mockUseSessions.mockReturnValueOnce({ data: undefined, isLoading: true, error: null });
        render(<JoinSession />);
        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('renders error page when error occurs', () => {
        const error = new Error('Test error');
        mockUseSessions.mockReturnValue({ data: undefined, isLoading: false, error: error as any });
        render(<BrowserRouter><JoinSession /></BrowserRouter>);
        expect(screen.getByText('error.unknown.title')).toBeInTheDocument();
        expect(screen.getByText('error.unknown.message')).toBeInTheDocument();
    });

    it('displays session list', () => {
        const sessions = [
            createMockSession({ id: 1, name: 'Session 1' }),
            createMockSession({ id: 2, name: 'Session 2' }),
        ];
        mockUseSessions.mockReturnValueOnce({ data: sessions, isLoading: false, error: null });
        render(<JoinSession />);
        expect(screen.getByText('Session 1')).toBeInTheDocument();
        expect(screen.getByText('Session 2')).toBeInTheDocument();
    });

    it('selects session and calls setSession on join', async () => {
        const user = userEvent.setup();
        const mockSetSession = jest.fn();
        mockUseAppStoreStartScreen.mockImplementation((selector: any) => {
            const state = { session: null, setSession: mockSetSession, clearSession: jest.fn() };
            return selector(state);
        });

        const sessions = [
            createMockSession({ id: 1, name: 'Session 1' }),
            createMockSession({ id: 2, name: 'Session 2' }),
        ];
        mockUseSessions.mockReturnValue({ data: sessions, isLoading: false, error: null });

        render(<BrowserRouter><JoinSession /></BrowserRouter>);

        await waitFor(() => {
            expect(screen.getByText('Session 1')).toBeInTheDocument();
        });

        const select = screen.getByRole('combobox');
        await user.selectOptions(select, '1');

        await waitFor(() => {
            expect(select).toHaveValue('1');
        });

        await user.click(screen.getByText('Beitreten'));

        await waitFor(() => {
            expect(mockSetSession).toHaveBeenCalled();
        });
        
        expect(mockSetSession).toHaveBeenCalledWith(expect.objectContaining({ id: expect.any(Number) }));
    });

    it('selects first session by default', () => {
        const sessions = [
            createMockSession({ id: 1, name: 'Session 1' }),
            createMockSession({ id: 2, name: 'Session 2' }),
        ];
        mockUseSessions.mockReturnValueOnce({ data: sessions, isLoading: false, error: null });
        render(<JoinSession />);
        expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('0');
    });
});

describe('SessionSelector', () => {
    beforeEach(() => {
        resetAllMocks();
    });

    it('renders create session form', () => {
        mockUseSessions.mockReturnValueOnce({ data: [], isLoading: false, error: null });
        render(<SessionSelector />);
        expect(screen.getByText('Neue Session erstellen')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Sessionnamen eingeben')).toBeInTheDocument();
    });

    it('renders join session component', () => {
        mockUseSessions.mockReturnValueOnce({ data: [], isLoading: false, error: null });
        render(<SessionSelector />);
        expect(screen.getByText('Bestehender Session beitreten')).toBeInTheDocument();
    });
});
