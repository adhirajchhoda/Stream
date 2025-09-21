/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // appDir is now stable in Next.js 14, remove this deprecated option
  },
  webpack: (config, { isServer }) => {
    // Handle WebAssembly for ZK proof generation
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Handle binary files for circuit artifacts
    config.module.rules.push({
      test: /\.(wasm|zkey|r1cs)$/,
      type: 'asset/resource',
    });

    // Suppress warnings from snarkjs/web-worker dependencies
    config.ignoreWarnings = [
      {
        module: /web-worker/,
        message: /Critical dependency/,
      },
      {
        module: /node_modules\/web-worker/,
      }
    ];

    // Node.js polyfills for browser compatibility
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer'),
      };
    }

    return config;
  },
  env: {
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1',
    NEXT_PUBLIC_BLOCKCHAIN_RPC_URL: process.env.NEXT_PUBLIC_BLOCKCHAIN_RPC_URL || 'http://localhost:8545',
    NEXT_PUBLIC_APP_ENV: process.env.NODE_ENV,
  },
  images: {
    domains: ['images.unsplash.com', 'via.placeholder.com'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'cross-origin',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;