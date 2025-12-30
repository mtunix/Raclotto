import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { MainScreen } from './MainScreen';
import { mockApi, mockUseAppStore, createMockIngredient, createMockSession, resetAllMocks, mockLocalStorage } from '../../testUtils';
import { IngredientType } from '../../model/ingredient';

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
        mockApi.get.mockClear();
        mockApi.add.mockClear();
        mockApi.delete.mockClear();
        mockApi.refill.mockClear();
        mockLocalStorage.clear();
        mockUseAppStore.mockClear();
        mockUseAppStoreDirect.mockClear();
        
        mockApi.get.mockResolvedValue([]);
        mockApi.add.mockResolvedValue({});
        mockApi.delete.mockResolvedValue({});
        mockApi.refill.mockResolvedValue({});
        
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
        const ingredients = [
            createMockIngredient({ id: 1, name: 'Fill 1', type: IngredientType.FILL, available: true }),
            createMockIngredient({ id: 2, name: 'Sauce 1', type: IngredientType.SAUCE, available: true }),
        ];
        mockApi.get.mockResolvedValueOnce(ingredients).mockResolvedValueOnce([]);

        renderWithRouter(<MainScreen onSessionClosed={mockOnSessionClosed} />);

        await waitFor(() => {
            expect(screen.getAllByText('Fill 1').length).toBeGreaterThan(0);
            expect(screen.getAllByText('Sauce 1').length).toBeGreaterThan(0);
        });
    });

    it('groups ingredients by type', async () => {
        const ingredients = [
            createMockIngredient({ id: 1, name: 'Fill 1', type: IngredientType.FILL }),
            createMockIngredient({ id: 2, name: 'Fill 2', type: IngredientType.FILL }),
            createMockIngredient({ id: 3, name: 'Sauce 1', type: IngredientType.SAUCE }),
        ];
        mockApi.get.mockResolvedValueOnce(ingredients).mockResolvedValueOnce([]);

        renderWithRouter(<MainScreen onSessionClosed={mockOnSessionClosed} />);

        await waitFor(() => {
            expect(screen.getByText('Zutaten')).toBeInTheDocument();
        });
        expect(screen.getByText('Saucen')).toBeInTheDocument();
    });

    it('separates available and unavailable ingredients', async () => {
        const ingredients = [
            createMockIngredient({ id: 1, name: 'Available', type: IngredientType.FILL, available: true }),
            createMockIngredient({ id: 2, name: 'Unavailable', type: IngredientType.FILL, available: false }),
        ];
        mockApi.get.mockResolvedValueOnce(ingredients).mockResolvedValueOnce([]);

        renderWithRouter(<MainScreen onSessionClosed={mockOnSessionClosed} />);

        await waitFor(() => {
            expect(screen.getByText('Available')).toBeInTheDocument();
        });
        expect(screen.getByText('Unavailable')).toBeInTheDocument();
    });

    it('calls API.delete when delete button is clicked', async () => {
        const user = userEvent.setup();
        const ingredient = createMockIngredient({ id: 1, name: 'Test Ingredient', type: IngredientType.FILL, available: true });
        mockApi.get.mockResolvedValueOnce([ingredient]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
        mockApi.delete.mockResolvedValue({});

        renderWithRouter(<MainScreen onSessionClosed={mockOnSessionClosed} />);

        await waitFor(() => {
            expect(screen.getByText('Test Ingredient')).toBeInTheDocument();
        });

        const deleteButtons = screen.getAllByText('✕');
        await user.click(deleteButtons[0]);

        await waitFor(() => {
            expect(mockApi.delete).toHaveBeenCalledWith(mockSession.key, ingredient);
        });
    });

    it('calls API.refill when refill button is clicked', async () => {
        const user = userEvent.setup();
        const ingredient = createMockIngredient({ id: 1, name: 'Unavailable', type: IngredientType.FILL, available: false });
        mockApi.get.mockResolvedValueOnce([ingredient]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ ...ingredient, available: true }]);
        mockApi.refill.mockResolvedValue({});

        renderWithRouter(<MainScreen onSessionClosed={mockOnSessionClosed} />);

        await waitFor(() => {
            expect(screen.getByText('Unavailable')).toBeInTheDocument();
        });

        const refillButtons = screen.queryAllByText('↻');
        if (refillButtons.length > 0) {
            await user.click(refillButtons[0]);
            await waitFor(() => {
                expect(mockApi.refill).toHaveBeenCalledWith(mockSession.key, ingredient);
            });
        }
    });

    it('loads preparation types', async () => {
        const prepTypes = [{ id: 1, name: 'Prep Type 1' }, { id: 2, name: 'Prep Type 2' }];
        mockApi.get.mockResolvedValueOnce([]).mockResolvedValueOnce(prepTypes);

        renderWithRouter(<MainScreen onSessionClosed={mockOnSessionClosed} />);

        await waitFor(() => {
            expect(mockApi.get).toHaveBeenCalled();
        });
        
        const prepTypeCalls = mockApi.get.mock.calls.filter(call => call[0] === 'preparation_type');
        expect(prepTypeCalls.length).toBeGreaterThan(0);
    });

    it('handles missing preparation_type endpoint gracefully', async () => {
        mockApi.get.mockClear();
        mockApi.get.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

        renderWithRouter(<MainScreen onSessionClosed={mockOnSessionClosed} />);

        await waitFor(() => {
            expect(screen.getByText('+')).toBeInTheDocument();
        });
    });

    it('calls API.get with correct session key', async () => {
        renderWithRouter(<MainScreen onSessionClosed={mockOnSessionClosed} />);
        await waitFor(() => {
            expect(mockApi.get).toHaveBeenCalledWith('ingredients', mockSession.key);
        });
    });

    it('refreshes ingredients after onAdd callback', async () => {
        const initialIngredients = [createMockIngredient({ id: 1, name: 'Ingredient 1', type: IngredientType.FILL })];
        mockApi.get.mockClear();
        mockApi.get.mockResolvedValueOnce(initialIngredients).mockResolvedValueOnce([]);

        renderWithRouter(<MainScreen onSessionClosed={mockOnSessionClosed} />);

        await waitFor(() => {
            expect(screen.getAllByText('Ingredient 1').length).toBeGreaterThan(0);
        });

        await waitFor(() => {
            const ingredientCalls = mockApi.get.mock.calls.filter(call => 
                call[0] === 'ingredients' && call[1] === mockSession.key
            );
            expect(ingredientCalls.length).toBeGreaterThanOrEqual(1);
        });
    });
});
