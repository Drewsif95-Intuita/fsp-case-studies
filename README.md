# FSP case studies

React and Vite app for browsing FSP case studies, live at https://fsp-case-study-hub.azurewebsites.net
behind FSP sign-in. Each case page is generated from the same record as its decks.

## The case study framework

The cases are not in this repository. They live in the case study framework, which writes the records,
builds the decks and checks them: `Code/FSP-Case-Study-Framework` on Drew's laptop, beside this folder.
This site reads three things from it: the records under `cases/`, the built decks in each
`cases/<id>/outputs/`, and its exporter, `scripts/export_site_cases.py`, which decides what a record
may put on a page. The exporter stays in the framework because it uses the deck builders and
templates directly.

`case-framework.json` says where the framework is, relative to this folder. Set `FSP_CASE_FRAMEWORK`
to override it for one shell. The hosted build (`npm run build:hosted`) needs neither; the dev server,
`npm run cases`, `npm run build` and `scripts/package.py` need both the folder and its Python.

Until 2026-09-28 the site lived inside the framework, at `discovery/websites/case-studies`. Its history
there is in the framework's commits `ec0d1e1`, `2c22490`, `586caed`, `f5ab587` and `821eb10`. The
commits before that in this repository are the old public site on GitHub Pages and Azure Static Web
Apps, which this code replaced.

## How a case page is made

The framework's exporter reads every `cases/<id>/case-study.yaml` and writes the case catalogue. Each page shows the copy from that case's `deck.one_pager` and `deck.long_form` slots, in
slide order, next to download buttons for the built PPTX files. It never reads `content.*`, and it
leaves out source-trace notes and layout switches, so a page cannot show a claim the decks do not
make. The app fetches the catalogue from `/api/cases` at runtime, and decks from `/api/decks/...`;
neither is ever bundled, so the site's public JavaScript holds no case copy.

- A format appears only if its PPTX exists in `cases/<id>/outputs/`.
- The exporter checks every line on the page against the built deck's own text. If a record has
  changed since its deck was built, the page says which lines are not in the deck; rebuild with
  `python scripts/build_case.py <id>`.
- Status, classification, sign-off and permissions come from the record's `qa` and `governance`
  fields, using the same status logic as `scripts/search_cases.py`.
- A long-form slide 4 that carries an imported source diagram links to the PPTX instead of
  redrawing it.

The generated file is gitignored. It holds every case's slide copy, drafts included.

## Local development

Needs Node 20.19 or later, the framework beside it (see above) and the framework's Python
requirements (`pip install -r requirements.txt` in the framework).

```bash
npm install
npm run dev
```

`npm run dev` and `npm run build` run the exporter first (`npm run cases` runs it alone), writing the
local catalogue to `src/data/generated/cases.local.json`. The dev server answers `/api/config`,
`/api/cases` and `/api/decks/...` itself, without sign-in, streaming decks from the framework's
`cases/*/outputs/`;
decks are never copied into `public/` or `dist/`. It re-runs the exporter and reloads the page when a
case record or deck changes. Set `PYTHON` if `python` on your PATH is not the right interpreter.

## Design

The look follows the FSP Data Products handbook, so the two internal sites share a palette, a type
system and a theme switch.

- **Tokens** are CSS custom properties at the top of `src/index.css`, taken from the handbook's
  proposal and 2026 brand layers. Page styles are in `src/case.css` and `src/product.css`.
- **Themes:** light and dark. An explicit choice from the top-bar toggle is stored under
  `fsp-case-hub-theme` and applied in `index.html` before the first paint. Without one, the system
  setting applies.
- **Type:** the brand face, Neue Haas Grotesk Text Pro, where it is installed. Otherwise Neue Haas
  Unica from the Adobe Fonts kit linked in `index.html`, then Helvetica Neue and Arial. The kit has
  weights 300, 400 and 700 only. Small labels use the system monospace, as the handbook does.
- **Logo:** `src/assets/fsp-logo-on-light.png` and `fsp-logo-on-dark.png` are the official artwork
  from the long-form template, copied unchanged. Never retype or recolour the wordmark.

## The FSP site

The site runs on the FSP tenant the way the Data Products handbook does: a Python App Service on the
handbook's shared Linux B1 plan in FSP Development (UK South), behind company sign-in through the
shared **Data Product - Internal Apps** registration. Targets are in `deployment/target.json`.

- **Who can open it:** any FSP member account; guests and other tenants are refused. Drew chose that
  audience on 2026-09-25. Every page and deck says it is an internal draft and not cleared externally.
- **What is public:** only the React shell, its assets, the sign-in bridge and the product demo.
  `server/app.py` serves the catalogue and decks from `/api/*` once `server/auth.py` has validated a
  delegated member token. That validator mirrors the handbook's `backend/auth.py`; keep them in step.
- **What it carries:** the case pages and the Anomaly Intelligence product page. The legacy pages,
  the campaign plan and the bundle stay in the local preview only; a hosted build leaves them out.

Release steps, from this folder:

```powershell
python -m venv .venv; .venv/Scripts/python.exe -m pip install -r requirements-dev.txt   # once
powershell -File scripts/provision.ps1                 # what-if for the web app
powershell -File scripts/provision.ps1 -Apply          # create or update it
powershell -File scripts/register-redirects.ps1        # show the two sign-in addresses to add
powershell -File scripts/register-redirects.ps1 -Apply # append them; nothing else on the registration changes
powershell -File scripts/deploy.ps1                    # build, test and package only
powershell -File scripts/deploy.ps1 -Upload            # upload a committed release
python scripts/smoke_live.py                           # anonymous live checks
```

`deploy.ps1` builds the hosted shell (`npm run build:hosted`), runs the server's security tests
(`server/tests`), and packages an explicit allowlist with `scripts/package.py`. The packager exports
the hosted catalogue fresh, refuses it if any page disagrees with its deck, checks every deck against
the hash the catalogue records, and fails if case copy has reached the public shell. Each package's
`version.json` records this repository's commit and the framework's. `deploy.ps1 -Upload` refuses
uncommitted work here, and in the framework's `cases`, `scripts`, `templates` and `config`. After an
upload, sign in with an FSP account to confirm access.

This repository no longer deploys anywhere by itself: the old GitHub Pages and Static Web Apps
workflows were removed on 2026-09-28. The copies they published before then may still be live until
they are taken down; see `deployment/STATUS.md`.

## Legacy pages and other content

`public/legacy-pages/` holds the case studies from the original HTML bundle. They are listed under
"Legacy pages" and are not verified: facts come from the case records, never from these pages. Retire
each one once its engagement has a generated page.

`src/data/page-catalog.json` lists the legacy pages, the product page and the campaign assets.
Product pages render natively from `src/data/products.ts` through `ProductPage.tsx`. The extraction
script reads the same catalogue when a bundle is re-exported:

```bash
npm run extract:legacy -- "C:\path\to\case_studies_fsp_design.html"
```

The shell components live under `src/components`:

- `SignInScreen.tsx` for company sign-in, shown until the catalogue has loaded
- `CasePage.tsx` for pages generated from case records
- `Topbar.tsx` for the wordmark, navigation toggle and theme toggle
- `Sidebar.tsx` for the searchable navigation rail, a drawer on small screens
- `LibraryDashboard.tsx` for the dashboard, filters, activity rail and cards
- `ProductPage.tsx` for native product-suite pages
- `Reader.tsx` for legacy HTML pages

Run `npm run build` and `npm run lint` after changes.
