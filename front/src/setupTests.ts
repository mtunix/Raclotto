import '@testing-library/jest-dom/vitest';
import { act, cleanup } from '@testing-library/react';
import { message } from 'antd';

// Tests see translation keys, and reach the network only through a transport they set or a mock of their own.
vi.mock('react-i18next', () => {
    // One `t` for every render, as the real hook keeps while the language stays; effects depend on it.
    const translation = { t: (key: string) => key };
    return {
        useTranslation: () => translation,
        initReactI18next: { type: '3rdParty', init: () => {} },
    };
});
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
// Width queries match `window.innerWidth` (jsdom's 1024, a desktop; `setViewportWidth` changes it), others never.
function matchesWidth(query: string): boolean {
    const conditions = [...query.matchAll(/\((min|max)-width:\s*([\d.]+)px\)/g)];
    return conditions.length > 0 && conditions.every(([, bound, px]) =>
        bound === 'min' ? window.innerWidth >= Number(px) : window.innerWidth <= Number(px));
}
Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
        matches: matchesWidth(query), media: query, onchange: null,
        addListener: () => {}, removeListener: () => {},
        addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    }),
});
const defaultWidth = window.innerWidth;
afterEach(() => {
    window.innerWidth = defaultWidth;
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

// antd's messages live outside the trees Testing Library unmounts, and render on React's scheduler: a
// render still queued when the file's jsdom is torn down fails the run. The first destroy mounts their
// holder, which destroys them a microtask later; the macrotask lets the scheduler's queued work run.
afterEach(async () => {
    cleanup();
    await act(async () => {
        message.destroy();
        await Promise.resolve();
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
});
