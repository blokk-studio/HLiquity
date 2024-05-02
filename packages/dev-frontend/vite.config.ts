/// <reference types="vitest" />

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import RollupPluginPolyfillNode from "rollup-plugin-polyfill-node";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  plugins: [nodePolyfills(), react()],
  define: { "process.env": {} }, // Coinbase SDK wants this
  optimizeDeps: {
    include: [
      "@liquity/providers",
      "@liquity/lib-ethers",
      "@liquity/lib-base",
      "@liquity/lib-react"
    ],
    force: true
  },
  resolve: {
    alias: {
      assert: "rollup-plugin-node-polyfills/polyfills/assert",
      events: "rollup-plugin-node-polyfills/polyfills/events"
    }
  },
  build: {
    commonjsOptions: {
      include: ["**.cjs", "**.js"]
    },
    rollupOptions: {
      plugins: [RollupPluginPolyfillNode()]
    }
  },
  // test: {
  //   globals: true,
  //   environment: "jsdom",
  //   setupFiles: "./src/setupTests.ts",
  //   deps: {
  //     inline: [
  //       "connectkit" // fixes import of "react/jsx-runtime"
  //     ]
  //   },
  //   testTimeout: 10000,
  //   // the WalletConnect connector of wagmi throws "EthereumProvider.init is not a function" ???
  //   dangerouslyIgnoreUnhandledErrors: true
  // },
  server: {
    cors: false
  }
});
