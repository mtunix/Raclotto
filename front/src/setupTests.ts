import '@testing-library/jest-dom/vitest';

// Tests see translation keys, and reach the network only through a transport they set or a mock of their own.
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
    initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('axios', () => {
    const axios = {
        get: vi.fn(() => Promise.resolve({ data: {} })),
        post: vi.fn(() => Promise.resolve({ data: {}, status: 200 })),
        patch: vi.fn(() => Promise.resolve({ data: {}, status: 200 })),
        delete: vi.fn(() => Promise.resolve({ data: {}, status: 200 })),
    };
    return { default: axios };
});

// antd's grid and typography watch media queries and element sizes, which jsdom does not implement.
Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
        matches: false, media: query, onchange: null,
        addListener: () => {}, removeListener: () => {},
        addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    }),
});
// antd's form schedules macrotasks over a MessageChannel; Node's would keep the test run from exiting.
class TimeoutMessageChannel {
    port1: { onmessage: ((event: { data: unknown }) => void) | null } = { onmessage: null };
    port2 = { postMessage: (data: unknown) => setTimeout(() => this.port1.onmessage?.({ data }), 0) };
}
globalThis.MessageChannel = TimeoutMessageChannel as unknown as typeof MessageChannel;
globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
};
