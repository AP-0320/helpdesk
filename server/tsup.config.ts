import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  clean: true,
  // Bundle @helpdesk/core inline so the production build has no dependency on
  // the TypeScript workspace source at runtime.
  noExternal: ['@helpdesk/core'],
})
