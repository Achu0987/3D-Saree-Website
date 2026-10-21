# Harsha — 3D Saree Store

A premium saree storefront built with Next.js and three.js: a live 3D silk drape in the hero, a scroll-driven 3D collection ring, a featured saree, a bag drawer, and an AI virtual try-on studio.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Virtual try-on

Try-on needs a server and an OpenAI API key with credit:

1. Copy `.env.local.example` to `.env.local` and set `OPENAI_API_KEY`.
2. Restart `npm run dev`.

`.env.local` is git-ignored — never commit your key.

## GitHub Pages

`.github/workflows/deploy.yml` publishes a static build on every push to `main`
(enable it once: **Settings → Pages → Source: GitHub Actions**).
GitHub Pages has no server, so on the published site the try-on button shows "Launching soon".
For live try-on, deploy to a host with server support (for example Vercel) and add `OPENAI_API_KEY` there.

## Editing content

Products, prices, hero fabrics and credits live in `data/catalog.js`.

## Credits

Saree, texture and craft photos are from Unsplash (free licence); photographers are credited in `data/catalog.js` and in the site footer.
Hero drape fabrics are AI-generated flat-lay recreations.
