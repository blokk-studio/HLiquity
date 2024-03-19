/// <reference types="vitest" />

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import RollupPluginPolyfillNode from "rollup-plugin-polyfill-node";
import { constants } from "http2";
import { replace as esbuildReplace } from "esbuild-plugin-replace";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  plugins: [react()],
  define: { "process.env": {} }, // Coinbase SDK wants this
  optimizeDeps: {
    include: [
      "@liquity/providers",
      "@liquity/lib-ethers",
      "@liquity/lib-base",
      "@liquity/lib-react"
    ],
    force: true,
    esbuildOptions: {
      plugins: [
        // @hashgraph/sdk needs Buffer, http2, util
        NodeGlobalsPolyfillPlugin({
          buffer: true
        }),
        NodeModulesPolyfillPlugin(),
        esbuildReplace({
          include: /@grpc\/grpc-js/,
          values: {
            "http2.constants": JSON.stringify({ constants })
          }
        })
      ]
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
  resolve: {
    alias: {
      assert: "rollup-plugin-node-polyfills/polyfills/assert",
      events: "rollup-plugin-node-polyfills/polyfills/events",
      util: "rollup-plugin-node-polyfills/polyfills/util"
    }
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
    deps: {
      inline: [
        "connectkit", // fixes import of "react/jsx-runtime"
        "rollup-plugin-node-polyfills"
      ]
    },
    testTimeout: 10000,
    // the WalletConnect connector of wagmi throws "EthereumProvider.init is not a function" ???
    dangerouslyIgnoreUnhandledErrors: true
  },
  server: {
    cors: false
  }
});
