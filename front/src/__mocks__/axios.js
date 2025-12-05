const axios = {
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {}, status: 200 })),
    patch: jest.fn(() => Promise.resolve({ data: {}, status: 200 })),
    delete: jest.fn(() => Promise.resolve({ data: {}, status: 200 })),
};

module.exports = axios;
module.exports.default = axios;
