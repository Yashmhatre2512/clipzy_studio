/** next.config.js */
module.exports = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpackDevMiddleware: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      poll: 1000,
      aggregateTimeout: 300,
    };
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:5000/api/:path*",
      },
    ];
  },
};
