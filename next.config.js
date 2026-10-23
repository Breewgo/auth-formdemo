const { withExpo } = require("@expo/next-adapter");

/** @type {import('next').NextConfig} */
const nextConfig = withExpo({
  // BUILD_IOS=1 makes a static site in out/ for the Capacitor iPhone app (team pwa-branch).
  output: process.env.BUILD_IOS === "1" ? "export" : undefined,
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: [
    "react-native",
    "react-native-web",
    "expo",
    "expo-camera",
    "expo-modules-core",
    // Add more React Native / Expo packages here...
  ],
  experimental: {
    forceSwcTransforms: true,
  },
});

module.exports = nextConfig;
