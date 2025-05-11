/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // ppr: true,
    serverComponentsExternalPackages: ['bcrypt', 'postgres'],
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
        protocol: 'https',
      },
    ],
  },
  webpack: (config) => {
    // Ignore specific modules that cause issues in client builds
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      perf_hooks: false,
      'mock-aws-s3': false,
      nock: false,
      _http_common: false,
      _stream_transform: false,
      _stream_readable: false,
      _stream_writable: false,
      _stream_duplex: false,
      stream: false,
      buffer: false,
      util: false,
    };

    return config;
  },
  // Setup custom headers to enforce proper security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' *.vercel.app api.openai.com data:",
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
  // Strip console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

module.exports = nextConfig;
