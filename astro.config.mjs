// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";

const repoName = "worldline-archive";
const githubUser = process.env.GITHUB_USER || "Error1125";

// https://astro.build/config
export default defineConfig({
  site: `https://${githubUser}.github.io`,
  base: `/${repoName}`,
  output: "static",
  integrations: [react(), mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
  // Astro 5 ships View Transitions (<ClientRouter />) out of the box.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
});
