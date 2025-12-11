import { Ingredient, IngredientType } from '../../model/ingredient';
import { Pan } from '../../model/pan';
import { Achievement } from '../../model/achievement';
import { RaclottoSession } from '../../model/raclottoSession';
import { Api } from '../../lib/api';

// Create a mock API type that extends Api but with jest mock functions
type MockedApi = {
    [K in keyof typeof Api]: jest.Mock;
};

// Create a mock API object with jest mock functions
export const mockApi: MockedApi = {
    get: jest.fn(),
    add: jest.fn(),
    delete: jest.fn(),
    refill: jest.fn(),
    generate: jest.fn(),
    rate: jest.fn(),
    close: jest.fn(),
    createSession: jest.fn(),
} as MockedApi;

jest.mock('../../lib/api/apiSession', () => ({
    useSessions: jest.fn(() => ({ data: [], isLoading: false, error: null })),
    ENDPOINT_SESSION: '/api/session',
}));

export const mockSession: RaclottoSession = {
    id: 1,
    key: 'test-session-key',
    name: 'Test Session',
    timestamp: new Date('2024-01-01'),
    active: true,
};

export const mockUseAppStore = jest.fn();
jest.mock('../../AppSlice', () => ({
    useAppStore: (selector: any) => mockUseAppStore(selector),
}));

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
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

export const createMockIngredient = (overrides?: Partial<Ingredient>): Ingredient => ({
    id: 1,
    name: 'Test Ingredient',
    type: IngredientType.FILL,
    available: true,
    meat: false,
    vegetarian: true,
    vegan: false,
    gluten: false,
    histamine: false,
    fructose: false,
    lactose: false,
    ...overrides,
});

export const createMockPan = (overrides?: Partial<Pan>): Pan => ({
    id: 1,
    name: 'Test Pan',
    user: 'Test User',
    timestamp: '2024-01-01T00:00:00Z',
    snacked: false,
    ingredients: [createMockIngredient()],
    ratings: [],
    rating: 0,
    ...overrides,
});

export const createMockAchievement = (overrides?: Partial<Achievement>): Achievement => ({
    id: 1,
    title: 'Test Achievement',
    description: 'Test Description',
    value: 10,
    hidden: false,
    ...overrides,
});

export const createMockSession = (overrides?: Partial<RaclottoSession>): RaclottoSession => ({
    ...mockSession,
    ...overrides,
});

export const resetAllMocks = () => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    mockApi.get.mockResolvedValue([]);
    mockApi.add.mockResolvedValue({} as Ingredient);
    mockApi.delete.mockResolvedValue({} as any);
    mockApi.refill.mockResolvedValue({} as Ingredient);
    mockApi.generate.mockResolvedValue({ generated: {} } as any);
    mockApi.rate.mockResolvedValue({} as any);
    mockApi.close.mockResolvedValue({} as any);
};
