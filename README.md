# Harsha — 3D Saree Store

A premium saree storefront built with Next.js and three.js:

- **Hero** — a live 3D silk drape with a weave picker
- **Collection** — a scroll-driven 3D ring of all 13 sarees
- **Drape studio** — the same model shown in every saree; auto-plays, tap to choose
- **Silk room** — saree fabrics hanging from a gold rod in 3D, swaying as you scroll and hover
- Saree of the week, the craft story, and a bag drawer

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## GitHub Pages

`.github/workflows/deploy.yml` publishes a static build on every push to `main`
(one-time setup: **Settings → Pages → Source: GitHub Actions**).

## Editing content

Products, prices, hero fabrics, silk-room fabrics and credits live in `data/catalog.js`.
Model looks are in `public/model/<saree-id>.webp`.

## Credits

Saree, texture and craft photos are from Unsplash (free licence); photographers are credited in `data/catalog.js` and in the site footer.
Hero fabrics and the drape-studio model looks are AI-generated.
