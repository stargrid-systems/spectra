# Spectra

Spectra is the universal UI for stargrid-systems products. It is currently focused
on serving as the local dashboard for the **eCube** energy storage system.

## Architecture

Spectra is a Nuxt 4 single-page application generated as a static site. It is
served by **aperture**, a Rust gateway application that runs on the eCube
container. Aperture hosts the static assets from a squashfs image and provides
the JSON API under `/api/v1`.

The eCube system consists of:

- **eCube**: the complete energy storage system
- **StorePilot**: the BMS master
- **CellGuard**: the BMS slave (cell balancing)
- **aperture**: Linux gateway that communicates with the BMS, handles
  high-level controls, and serves Spectra
- **Spectra**: this UI frontend

Spectra is a pure frontend. All business logic lives in aperture and the BMS
controllers. Spectra fetches data from aperture's API and renders it.

## Development

Requires Node.js 24.

```bash
npm install        # Install dependencies
npm run dev        # Start dev server at http://localhost:3000
```

### Quality commands

```bash
npm run lint       # Run ESLint
npm run lint:fix   # Run ESLint with --fix
npm run format     # Format with Prettier
npm run format:check  # Check formatting without writing
npm run typecheck  # Run vue-tsc type checking
npm run test       # Run vitest
npm run test:watch # Run vitest in watch mode
```

### API code generation

Spectra consumes aperture's OpenAPI spec to generate TypeScript types for the
API layer. The spec lives at `openapi/openapi.json` and the generated types at
`app/utils/api/generated.ts`.

To regenerate after aperture changes:

1. From the aperture directory: `cargo run -- openapi > ../spectra/openapi/openapi.json`
2. From the spectra directory: `npm run openapi:generate`

The generation script patches the spec with missing enum schemas and resolves
a duplicate operation ID. See `scripts/patch-openapi.mjs`.

### Production build

```bash
npm run generate   # Generate static site in .output/public
npm run preview    # Preview the production build locally
```

The build output is packed into a squashfs image by CI and published to the
container registry. Aperture serves it directly from the image.

## Tech stack

- [Nuxt 4](https://nuxt.com) with Vue 3
- [Nuxt UI](https://ui.nuxt.com) component library
- [@nuxtjs/i18n](https://i18n.nuxtjs.org) for multi-language support (en, de)
- [nuxt-charts](https://github.com/danielroe/nuxt-charts) for data visualization
- [openapi-typescript](https://github.com/drwpow/openapi-typescript) for API type generation
