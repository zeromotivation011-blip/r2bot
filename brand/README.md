# R2BOT Brand Assets

**3D dimensional logo** — a glossy, premium robot-helmet app-icon (Raycast / Arc style) on a deep navy tile, paired with a bold Poppins-Bold wordmark. Robotics-forward, tactile, futuristic. The wordmark is outlined to vector paths (no fonts needed).

Palette: amber `#f59e0b` (light `#fbbf24`, glow `#fde68a`, deep `#b45309`) · navy tile `#0f172a`→`#070d1c` · light text `#f8fafc`.

## Files

| File | Use |
|------|-----|
| `r2bot-icon-3d.svg` | Master icon (vector source) |
| `r2bot-icon.png` (1024) · `-512` · `-256` | Raster icon at common sizes |
| `r2bot-app-icon.svg/.png` | App / PWA icon (512px tile) |
| `r2bot-favicon-32.png` · `-64.png` | Browser tab favicon |
| `r2bot-apple-touch-180.png` | iOS home-screen icon |
| `r2bot-logo-horizontal-dark.svg/.png` | Header logo, dark backgrounds (light wordmark) |
| `r2bot-logo-horizontal-light.svg/.png` | Header logo, light backgrounds (navy wordmark) |
| `r2bot-logo-horizontal-onfill.svg/.png` | Horizontal logo on a dark rounded fill |
| `r2bot-logo-stacked-dark.svg/.png` | Stacked logo + tagline, dark backgrounds |
| `r2bot-logo-stacked-light.svg/.png` | Stacked logo + tagline, light backgrounds |
| `r2bot-logo-stacked-onfill.svg/.png` | Stacked logo on a dark rounded fill |

Tagline: **From zero to robotics engineer.**

## Quick use in Next.js

```tsx
// Header — pick the variant that matches the background
<Image src="/brand/r2bot-logo-horizontal-dark.svg" alt="R2BOT" width={300} height={86} priority />
```

```ts
// app/layout.tsx metadata
icons: { icon: '/brand/r2bot-favicon-32.png', apple: '/brand/r2bot-apple-touch-180.png' }
```

Notes: the icon tile is dark by design and reads well on both light and dark pages. Use the **-dark** lockups (light wordmark) on dark surfaces and **-light** lockups (navy wordmark) on light surfaces. Lockup SVGs embed the icon render, so they're self-contained. Keep clear space of about the antenna's height around the logo; don't recolor the helmet or restyle the type.
