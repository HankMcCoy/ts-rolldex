import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  ssr: { noExternal: ["react-markdown", "remark-gfm"] },
  server: {
    warmup: {
      ssrFiles: [
        "./src/lib/auth.ts",
        "./src/lib/access.ts",
        "./src/db/index.ts",
        "./src/db/schema/index.ts",
      ],
    },
  },
  plugins: [
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
