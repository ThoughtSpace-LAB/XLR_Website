import path from "path";
import { fileURLToPath } from "url";

import { defineConfig } from "astro/config";

import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import compress from "astro-compress";

import astrowind from "./vendor/integration";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  output: "static",

  integrations: [
    sitemap(),

    compress({
      CSS: true,
      HTML: {
        "html-minifier-terser": {
          removeAttributeQuotes: false,
        },
      },
      Image: false,
      JavaScript: true,
      SVG: false,
      Logger: 1,
    }),

    astrowind({
      config: "./src/config.yaml",
    }),
  ],

  image: {
    domains: ["cdn.pixabay.com"],
  },

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "~": path.resolve(__dirname, "./src"),
      },
    },
  },
});
