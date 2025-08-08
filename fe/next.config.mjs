/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ["localhost"],
    unoptimized: true,
  },
  experimental: {
    // Loại bỏ appDir vì đã deprecated trong Next.js 14
  },
  // Thêm cấu hình để tránh lỗi useSearchParams
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
}

export default nextConfig
