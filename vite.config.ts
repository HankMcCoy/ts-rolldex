import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

// routeTree.gen.ts has `import type { getRouter } from './router.tsx'` inside
// a `declare module` block, and router.tsx imports routeTree.gen.ts — a cycle.
// TypeScript erases `import type` at compile time but Vite SSR does not, so it
// treats both directions as runtime deps, causing "before initialization" errors
// on every HMR reload. This plugin strips the type-only import from the
// generated file during Vite's transform phase where it has always been a no-op.
// Track https://github.com/TanStack/router/issues/XXXX — remove once fixed upstream.
const ROUTE_TREE_TYPE_IMPORT_RE = /^import type \{[^}]*\} from ['"][^'"]+['"];?\r?\n?/gm
const stripRouteTreeTypeImports = {
  name: 'strip-routetree-type-imports',
  transform(code: string, id: string) {
    if (!id.includes('routeTree.gen')) return
    if (!ROUTE_TREE_TYPE_IMPORT_RE.test(code)) {
      // The generated format changed — this plugin may no longer be needed
      // or may need updating. Remove it if the HMR cycle is gone upstream.
      throw new Error(
        '[strip-routetree-type-imports] Expected import type pattern not found in routeTree.gen.ts. ' +
        'The TanStack Router code-gen format may have changed. Check if this plugin is still needed.'
      )
    }
    ROUTE_TREE_TYPE_IMPORT_RE.lastIndex = 0
    return {
      code: code.replace(ROUTE_TREE_TYPE_IMPORT_RE, ''),
      map: null,
    }
  },
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  ssr: { noExternal: ["react-markdown", "remark-gfm"] },
  plugins: [
    stripRouteTreeTypeImports,
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
