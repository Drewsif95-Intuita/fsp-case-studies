# FSP case studies

React and Vite app for the FSP Data and AI case study programme.

The current case-study bundle has been split into individual static HTML pages
under `public/legacy-pages`. React owns the app shell, routing, navigation,
search, filters, product pages, and document viewer.

The current local design is a standalone app shell: searchable sidebar,
collapsible navigation, library dashboard, and focused embedded case-study
documents.

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The production build is emitted to `dist`.

## Content model

`src/data/page-catalog.json` is the source of truth for the library. Each entry
defines the route, display labels, category, source bundle filename, generated
asset filename where relevant, sector, template, description, summary, tags,
owner, audience, and read-time metadata.

`src/data/pages.ts` derives app-ready values from that catalogue, including:

- `assetPath`
- `fullTitle`
- `summary`
- `sectorKey`
- case-study, product, and campaign collections
- filter options
- template counts

The extraction script also reads `src/data/page-catalog.json`, so the app and
generated static assets stay aligned.

Product detail content lives in `src/data/products.ts`. Product catalogue items
use `category: "product"` and a `productKey` that maps to the matching product
suite data.

## Add or edit content

For small edits to existing case studies, edit the relevant file in
`public/legacy-pages`.

To add a new case study:

1. Add the page to the source bundle, or keep it as a standalone exported HTML
   file and pass it to the extraction script.
2. Add one entry to `src/data/page-catalog.json`.
3. Use a stable route such as `/case-studies/example-client`.
4. Set `category` to `case-study`, `product`, `campaign`, or `overview`.
5. Add `summary`, `tags`, `readMinutes`, `updated`, `audience`, and `owner`
   metadata so the library card and sidebar update automatically.
6. Run `npm run build` and `npm run lint`.

To add a new product page:

1. Add a product catalogue entry in `src/data/page-catalog.json`.
2. Set the route under `/products/...`, set `category` to `product`, and add a
   stable `productKey`.
3. Add the product suite or product definition in `src/data/products.ts`.
4. Product pages render natively through `ProductPage.tsx`, so no legacy HTML
   asset is required.
5. Run `npm run build` and `npm run lint`.

The shell components live under `src/components`:

- `Sidebar.tsx` for searchable grouped navigation
- `LibraryDashboard.tsx` for dashboard, filters, activity rail, and cards
- `ProductPage.tsx` for native product-suite pages
- `Reader.tsx` for the focused embedded HTML page

When replacing the whole exported bundle, first add any new page mappings to
`src/data/page-catalog.json`, then run:

```bash
npm run extract:legacy -- "C:\path\to\case_studies_fsp_design.html"
```

Standalone HTML exports can be added after the bundle path:

```bash
npm run extract:legacy -- "C:\path\to\case_studies_fsp_design.html" "C:\path\to\new_case_study.html"
```

## Azure Static Web Apps

This repo includes an Azure Static Web Apps workflow and
`public/staticwebapp.config.json`. Vite copies that config into `dist` during
the production build so Azure Static Web Apps can apply routing rules.

Create an Azure Static Web Apps resource, connect it to this GitHub repo, and
add the deployment token as the repository secret referenced by the workflow.

Recommended build settings:

```text
App location: /
Output location: dist
API location: blank
```

The current static web app config is public-link friendly. For an internal-only
deployment later, configure Microsoft Entra ID so sign-in is restricted to the
intended tenant or group before sharing the URL.
