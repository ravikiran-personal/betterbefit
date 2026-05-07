/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Expose build ID to the service worker via a custom header so the SW can
  // self-invalidate its cache on each deployment without a manual version bump.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "X-Build-Id", value: process.env.BUILD_ID ?? "dev" }
        ]
      }
    ];
  }
};

export default nextConfig;
