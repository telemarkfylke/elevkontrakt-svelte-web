import adapter from '@sveltejs/adapter-auto'
import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    sveltekit({
      // adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
      adapter: adapter()
    })
  ]
})
