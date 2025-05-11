'use client';

// Provide client-side polyfills if in browser
if (typeof window !== 'undefined') {
  // Mock Node.js built-ins
  window._http_common = {};
  window._stream_transform = {};
  window._stream_readable = {};
  window._stream_writable = {};
  window._stream_duplex = {};
}
