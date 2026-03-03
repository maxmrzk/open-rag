import { defineConfig } from "vitepress";

export default defineConfig({
  title: "open-rag",
  description: "Open-source visual studio for building, evaluating, and deploying RAG pipelines.",
  base: "/open-rag/",

  head: [["link", { rel: "icon", href: "/open-rag/favicon.ico" }]],

  themeConfig: {
    logo: null,
    siteTitle: "open-rag",

    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Deployment", link: "/guide/deployment" },
      { text: "GitHub", link: "https://github.com/maxmrzk/open-rag" },
    ],

    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "What is open-rag?", link: "/guide/what-is-open-rag" },
          { text: "Getting Started", link: "/guide/getting-started" },
        ],
      },
      {
        text: "Setup",
        items: [
          { text: "Installation", link: "/guide/installation" },
          { text: "Deployment", link: "/guide/deployment" },
        ],
      },
      {
        text: "Features",
        items: [
          { text: "System Designer", link: "/guide/system-designer" },
          { text: "Evaluation Runs", link: "/guide/evaluation-runs" },
          { text: "Component Library", link: "/guide/component-library" },
          { text: "Docker Export", link: "/guide/docker-export" },
        ],
      },
    ],

    socialLinks: [{ icon: "github", link: "https://github.com/maxmrzk/open-rag" }],

    footer: {
      message: "Released under the MIT License.",
      copyright: "open-rag – code never leaves your machine.",
    },

    editLink: {
      pattern: "https://github.com/maxmrzk/open-rag/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },
  },
});
