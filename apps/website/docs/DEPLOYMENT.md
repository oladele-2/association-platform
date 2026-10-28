# Standalone deployment

This repository deploys the `nma-ogun-website` Cloudflare Worker and its own assets. Project root is `/`; no monorepo or portal checkout is used. Node 24 and pnpm 9.15.0 are pinned by the workflow.

## One-time credential setup

Create a Cloudflare API token using the **Edit Cloudflare Workers** template, restricted to the association's account and the `nmaogun.com.ng` zone. It must permit deployment of Workers and their routes/custom domains. Store its value in GitHub Actions as `CLOUDFLARE_API_TOKEN`, either in this repository's secrets or the `production` environment. Never paste the token into an issue, chat, source file or commit. The nonsecret account ID is configured in the deployment job.

The repository also needs `WEBSITE_EXPORT_SECRET`, matching the portal Worker's existing export credential. This authorizes the approved export and release-status callbacks. It is configured independently of the Cloudflare deployment token. Neither credential is placed in the public website Worker.

- Cloudflare token creation: https://dash.cloudflare.com/profile/api-tokens
- Repository secrets: https://github.com/oladele-2/nma-ogun-website/settings/secrets/actions

## Release flow

Publish or withdraw in the portal, then open GitHub Actions → Website checks and deployment → Run workflow on main. This fetches the latest approved feed, builds and deploys the website. No content commit or push is required. Code pushes to main also release the current approved feed. There are no scheduled publication checks. Pull requests run checks without secrets or deployment.

The workflow reports Deploying to the portal, exports a consistent approved snapshot, applies the media policy, tests and builds it, and deploys the exact verified Worker bundle and asset artifact. Public page checks, social checks and an exact live-manifest comparison run before the Live callback. Failed checks/deployments report Failed; manually rerun the workflow to retry. Runs are serialized, and callback ordering prevents stale runs from overwriting newer results. The portal checks the website manifest as the authority for what is actually live and refreshes its status every twenty seconds.

`publication-status.json` contains only public entry IDs/revisions, the portal generation and the source commit. It is served with no-store headers. The full snapshot is packaged under the blocked `/_publication` directory for artifact verification, not public download. Build artifacts contain approved public content only, never export or deployment credentials.

Use this GitHub workflow as the automatic deployment mechanism. Do not enable a second independent Cloudflare Git build trigger for the same branch. If a Cloudflare Git integration is used instead, disable the GitHub deployment job and configure root `/`, build `pnpm build`, deploy `pnpm exec wrangler deploy`.

`content/baseline` preserves the twenty-four previously approved legacy articles and officer profiles. The private release endpoint includes ownership keys for every portal entry that has ever been published. A portal entry takes ownership of a matching type/slug on its first publication; its replacement supersedes the baseline, and a later withdrawal removes it without resurrecting the legacy version. Unclaimed legacy items remain public. To move a legacy item into portal management, create and publish its matching content type and slug with reviewed content and media. Drafts alone never take ownership.

`content/publication-policy.json` permanently excludes the previously held account screenshot from automated exports. Approved article text remains available without that image. A replacement image needs a new media ID and normal publisher approval. This policy must not be removed merely to make an export match the portal.

The website remains a standalone deployment and does not query the portal while serving public pages. The canonical officer page is `/executives`; `/leadership` redirects there. Manual complete-release imports remain an emergency operator tool, not the normal publisher workflow. An emergency deployment without portal source metadata is not reported as an automatically verified Live release; run the normal workflow afterwards to restore that confirmation.

For emergency/manual deployment, use a logged-in Wrangler session, run `pnpm test:standalone` and `pnpm typecheck`, then `pnpm exec wrangler deploy`. Record the version ID and run `pnpm verify:public` and `pnpm verify:social`. Use `--public-dns` for these verification scripts if local DNS is stale; normal certificate validation remains enabled.

Before rollback, check whether an older snapshot contains withdrawn material. Prefer deploying a corrected current release to blindly restoring an older content version.
