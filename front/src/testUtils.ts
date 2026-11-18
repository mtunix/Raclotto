import { IngredientType } from './api/generated/model';
import type {
    IngredientDto,
    IngredientForUserDto,
    SessionDto,
} from './api/generated/model';

export const mockSession: SessionDto = {
    id: 1,
    key: 'test-session-key',
    name: 'Test Session',
    timestamp: '2024-01-01T00:00:00',
    active: true,
    created_by_user_id: null,
};

export const mockUseAppStore = jest.fn();
jest.mock('./AppSlice', () => ({
    useAppStore: (selector: any) => mockUseAppStore(selector),
}));

jest.mock('react-router', () => ({
    ...jest.requireActual('react-router'),
    useSearchParams: () => [new URLSearchParams(), jest.fn()],
    useNavigate: () => jest.fn(),
    useParams: () => ({ sessionId: '123' }),
    useLocation: () => ({ pathname: '/123' }),
    useRouteError: () => null,
}));

export const mockLocalStorage = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => {
            store[key] = value.toString();
        }),
        removeItem: jest.fn((key: string) => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        }),
    };
})();

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

export const createMockIngredient = (overrides?: Partial<IngredientDto>): IngredientDto => ({
    id: 1,
    name: 'Test Ingredient',
    type: IngredientType.FILL,
    available: true,
    meat: false,
    vegetarian: true,
    vegan: false,
    fish: false,
    gluten: false,
    histamine: false,
    fructose: false,
    lactose: false,
    spicy: 0,
    wildcard: false,
    sweet: false,
    session_id: 1,
    ...overrides,
});

export const createMockIngredientForUser = (overrides?: Partial<IngredientForUserDto>): IngredientForUserDto => ({
    ...createMockIngredient(),
    applicable: true,
    ...overrides,
});

export const createMockSession = (overrides?: Partial<SessionDto>): SessionDto => ({
    ...mockSession,
    ...overrides,
});

export const resetAllMocks = () => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
};
