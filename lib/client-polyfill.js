// Empty implementations for Node.js built-ins
if (typeof window !== 'undefined') {
  // Client-side polyfills
  global._http_common = {};
  global._stream_transform = {};
  global._stream_readable = {};
  global._stream_writable = {};
  global._stream_duplex = {};
}

export {};
