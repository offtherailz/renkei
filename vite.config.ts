import { defineConfig } from "vite";

function resolveBase(): string {
  const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
  if (process.env.GITHUB_ACTIONS && repo) {
    return `/${repo}/`;
  }
  return "/";
}

export default defineConfig({
  base: resolveBase()
});
