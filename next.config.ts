import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/scorecard/:pillar', destination: '/scorecard', permanent: false },
    ]
  },
};

export default nextConfig;
