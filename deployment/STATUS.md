# Deployment status

Update this file after every upload. Each package records the commit it was built from in
`version.json`, and `artifacts/package-report.json` records the package hash on the machine that
built it (see the README's release steps).

## Live: https://fsp-case-study-hub.azurewebsites.net

| | |
|---|---|
| Last upload | 25 September 2026, 09:35 UTC: Azure deployment `9c46cc78`, completed |
| Commit | `f5ab587` in the case study framework, where the site lived until 2026-09-28. Later uploads record this repository's commit and the framework's |
| Package | 51 files, 19,972,871 bytes, SHA-256 `91bb00a001ed4cc84a1de2d49352f528ffeb23b45f7dcdd2d7c5efdd079ef70a` |
| Content | 23 case studies with 34 decks, all AI-reviewed internal drafts, and the Anomaly Intelligence product page. No legacy pages. |
| Web app | `fsp-case-study-hub`, Python 3.13, on the shared Linux B1 plan `ASP-fspdataproductdevrg-a4ba` (FSP Development, UK South), beside the handbook, Skills Matrix and InternalCV |
| Sign-in | The shared Data Product - Internal Apps registration. `/auth/complete` and `/auth/bridge` appended on 25 September 2026; the eight existing addresses and every other setting kept |
| Checked after upload | `python scripts/smoke_live.py`: 14 of 14 passed (health, sign-in configuration, shell and bridge, catalogue and decks refused without sign-in, forged token refused, private and legacy paths 404) |
| Not yet verified | Company sign-in with a real FSP account; refusal of a real guest account; memory and CPU on the shared plan now that it runs a fifth app |

## The old public copies

Until 2026-09-28 this repository held the earlier site and deployed it on every push to `main`:
to GitHub Pages at https://drewsif95-intuita.github.io/fsp-case-studies/ and to Azure Static Web Apps
at https://mango-pebble-0e99dc61e.7.azurestaticapps.net/ (Intuita account). Both were public and
carried the legacy client pages. The workflows were removed when this code replaced it, so neither
updates any more, but each keeps serving its last deployment until it is taken down.
