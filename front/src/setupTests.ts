import '@testing-library/jest-dom/vitest';
import { act, cleanup } from '@testing-library/react';
import { message } from 'antd';
import type { MockInstance } from 'vitest';

// Tests see translation keys, and reach the network only through a transport they set or a mock of their own.
vi.mock('react-i18next', () => {
    // One `t` for every render, as the real hook keeps while the language stays; effects depend on it.
    const translation = { t: (key: string) => key };
    return {
        useTranslation: () => translation,
        initReactI18next: { type: '3rdParty', init: () => {} },
    };
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
// A request no test answered rejects instead of reaching the network. Imported late, so a test file's own
// `vi.mock('axios')` still reaches the transport.
beforeEach(async () => {
    const [{ setTransport }, { FakeTransport }] = await Promise.all([
        import('./lib/api/transport'),
        import('./lib/api/fakeTransport'),
    ]);
    setTransport(new FakeTransport());
});

// A console error fails the test; one that expects errors silences them with its own `mockImplementation`.
let consoleErrors: unknown[][] = [];
let consoleError: MockInstance<typeof console.error> | undefined;
beforeEach(() => {
    consoleErrors = [];
    consoleError = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
        consoleErrors.push(args);
    });
});
afterEach(() => {
    consoleError?.mockRestore();
    if (consoleErrors.length > 0) {
        throw new Error(`Unexpected console.error:\n${consoleErrors.map((args) => args.map(String).join(' ')).join('\n')}`);
    }
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
