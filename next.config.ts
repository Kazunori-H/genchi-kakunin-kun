import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    // ワークスペースルートを明示的に指定して警告を解消
    root: process.cwd(),
  },
};

export default nextConfig;
