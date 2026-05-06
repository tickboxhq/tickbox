import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Tickbox SDKs are ESM-only. Next 15 handles this fine, but if you see
  // an "ESM module" error in older Next versions, add them here:
  // transpilePackages: ['@tickboxhq/core', '@tickboxhq/react'],
}

export default nextConfig
