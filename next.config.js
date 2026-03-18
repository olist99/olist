/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // Short timeout so if any page somehow tries to do a DB query at build
  // time it fails fast rather than hanging forever.
  staticPageGenerationTimeout: 30,
};

module.exports = nextConfig;
