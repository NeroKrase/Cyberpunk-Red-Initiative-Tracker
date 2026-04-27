// Tauri doesn't have a Node.js server to do proper SSR
// so we use adapter-static with a fallback to index.html to put the site in SPA mode
// See: https://svelte.dev/docs/kit/single-page-apps
// See: https://v2.tauri.app/start/frontend/sveltekit/ for more info
export const ssr = false;

// Eagerly pull every route module (and its scoped CSS) into the layout bundle
// so Vite/Tauri can't paint a route before its styles are ready on cold start.
import.meta.glob("./**/+page.svelte", { eager: true });
