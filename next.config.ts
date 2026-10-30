import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 上传的图片通过 /api/avatar 流式返回，避免让 Next 图片优化器吞掉非标准来源。
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
