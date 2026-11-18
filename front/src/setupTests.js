// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock deserialize-json-api/src
jest.mock('deserialize-json-api/src', () => ({
    deserialize: (data) => data,
}));

// Mock API - basic mock, will be overridden by testUtils in component tests
jest.mock('./lib/api', () => ({
    Api: {
        get: jest.fn(() => Promise.resolve([])),
        add: jest.fn(() => Promise.resolve({})),
        delete: jest.fn(() => Promise.resolve({})),
        refill: jest.fn(() => Promise.resolve({})),
        generate: jest.fn(() => Promise.resolve({ generated: {} })),
        rate: jest.fn(() => Promise.resolve({})),
        close: jest.fn(() => Promise.resolve({})),
    },
}));

// Mock apiSession
jest.mock('./lib/api/apiSession', () => ({
    useSessions: jest.fn(() => ({ data: [], isLoading: false, error: null })),
    ENDPOINT_SESSION: '/api/session',
}));

// Mocks are in __mocks__ directory (antd.js, react-i18next.js, axios.js)
