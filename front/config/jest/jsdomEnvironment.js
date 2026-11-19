'use strict';

const { TestEnvironment } = require('jest-environment-jsdom');

// jsdom leaves out the fetch API and the encoders that react-router's data routers use. Node's own
// are taken over together with its AbortController, since its Request rejects jsdom's AbortSignal.
const NODE_GLOBALS = [
  'TextEncoder',
  'TextDecoder',
  'Request',
  'Response',
  'Headers',
  'fetch',
  'AbortController',
  'AbortSignal',
  'ReadableStream',
  'structuredClone',
];

class JsdomEnvironment extends TestEnvironment {
  constructor(...args) {
    super(...args);
    for (const name of NODE_GLOBALS) {
      this.global[name] = globalThis[name];
    }
  }
}

module.exports = JsdomEnvironment;
