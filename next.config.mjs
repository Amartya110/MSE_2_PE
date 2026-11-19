/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  outputFileTracingRoot: process.cwd(),
  async rewrites() {
    const apiServer =
      process.env.API_SERVER_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiServer.replace(/\/+$/, '')}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
