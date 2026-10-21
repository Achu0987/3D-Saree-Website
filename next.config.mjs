// GitHub Pages build (GITHUB_PAGES=true): plain static files served from /<repo-name>/.
const pages = process.env.GITHUB_PAGES === "true";

/** @type {import('next').NextConfig} */
const nextConfig = pages
  ? {
      output: "export",
      basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {};

export default nextConfig;
