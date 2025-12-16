/** @type {import('next').NextConfig} */

const nextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  allowedDevOrigins: ["*.theopenbuilder.com"],
};

// Suppress ECONNRESET and other common network errors
if (typeof process !== 'undefined') {
  const originalEmit = process.emit;
  process.emit = function (event, ...args) {
    if (event === 'uncaughtException' || event === 'unhandledRejection') {
      const error = args[0];
      if (error && (error.code === 'ECONNRESET' || 
                   error.message?.includes('ECONNRESET') ||
                   error.code === 'ECONNABORTED' ||
                   error.message?.includes('aborted'))) {
        return false; // Suppress network connection errors
      }
    }
    return originalEmit.apply(process, [event, ...args]);
  };

  // Suppress console errors for ECONNRESET
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    if (message.includes('ECONNRESET') || 
        message.includes('aborted') ||
        message.includes('ECONNABORTED')) {
      return; // Suppress these specific errors
    }
    return originalConsoleError.apply(console, args);
  };
}

export default nextConfig;
