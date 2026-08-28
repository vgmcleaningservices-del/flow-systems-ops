/** @type {import('next').NextConfig} */
const nextConfig = {
  // No ESLint config is set up in this project — don't let a missing/absent
  // lint setup block `next build` on Vercel.
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
