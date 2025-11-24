/// <reference types="vitest" />

import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import openapiTypescript, { astToString } from "openapi-typescript";
import { writeFile, mkdir } from "fs/promises";
import { cwd } from "process";
import { join } from "path";
import { existsSync } from "fs";
import svgr from "vite-plugin-svgr";

const getMirrorNodeTypegenPlugin = (options?: {
  /**
   * the folder to write the types to
   *
   * @default '.mirror-node''
   */
  outDir?: string;
}): Plugin => {
  return {
    name: "mirrorNodeTypegen",
    async buildStart() {
      const indexDtsFileAst = await openapiTypescript(
        "https://mainnet.mirrornode.hedera.com/api/v1/docs/openapi.yml"
      );
      const indexDtsFileString = astToString(indexDtsFileAst);

      const outDir = options?.outDir ?? ".mirror-node";
      const outDirFilePath = join(cwd(), outDir);
      if (!existsSync(outDirFilePath)) {
        await mkdir(outDirFilePath);
      }

      const indexDtsFilePath = join(outDirFilePath, "index.d.ts");
      await writeFile(indexDtsFilePath, indexDtsFileString);
    }
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  plugins: [
    svgr({
      svgrOptions: {
        dimensions: false,
        svgProps: {
          role: "img"
        }
      }
    }),
    nodePolyfills(),
    react(),
    getMirrorNodeTypegenPlugin()
  ],
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
      // plugins: [NodeModulesPolyfillPlugin()]
    }
  },
  build: {
    commonjsOptions: {
      include: ["**.cjs", "**.js"]
    },
    rollupOptions: {
      // plugins: [RollupPluginPolyfillNode()]
    }
  },
  // resolve: {
  //   alias: {
  //     assert: "rollup-plugin-node-polyfills/polyfills/assert",
  //     events: "rollup-plugin-node-polyfills/polyfills/events"
  //   }
  // },
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
  },
  css: {
    transformer: "lightningcss",
    lightningcss: {
      cssModules: {
        dashedIdents: true
      },
      drafts: {
        customMedia: true
      }
    }
  }
});
