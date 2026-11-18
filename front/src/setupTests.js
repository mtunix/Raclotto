// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// antd's grid and typography watch media queries and element sizes, which jsdom does not implement.
Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query) => ({
        matches: false, media: query, onchange: null,
        addListener: () => {}, removeListener: () => {},
        addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
    }),
});
global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

// Mocks are in __mocks__ directory (react-i18next.js, axios.js)
