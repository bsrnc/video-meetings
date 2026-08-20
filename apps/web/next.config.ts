import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // `next dev` refuses to start while another one is running in this
  // directory, and the lock lives in the dist dir — so the e2e suite could
  // not run at all with a dev server open. The Playwright config sets
  // `NEXT_DIST_DIR=.next-e2e` so its own server has a dist dir of its own.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
};

export default nextConfig;
