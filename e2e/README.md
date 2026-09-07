# Browser tooling

Playwright, set up so an agent (or you) can drive a real browser against a
running app to check that a change actually works. **This is not a maintained
regression suite** — `smoke.spec.ts` exists to prove the harness is wired up.

```bash
pnpm e2e          # run everything headless
pnpm e2e:ui       # interactive runner
pnpm exec playwright test --headed --debug e2e/smoke.spec.ts
pnpm exec playwright codegen http://localhost:3000   # record selectors
```

`playwright.config.ts` starts the app with `pnpm dev` if nothing is listening on
:3000, which also brings up Postgres and migrates it. If you already have
`pnpm dev` running, that server is reused.

## Writing a one-off check

`helpers/auth.ts` has `registerAndLogin(page)` and `createCampaign(page, name)`.
Every run registers a **fresh** user against the local database — there is no
teardown, so rows accumulate. `pnpm db:reset` drops the volume and starts clean.

Point somewhere else with `E2E_BASE_URL=https://… pnpm e2e`. Don't run these
against anything whose data you care about: they create accounts and campaigns.

## Gotchas

- **Wait for hydration before filling fields.** `waitForHydration(page)` is
  exported from `helpers/auth.ts` and every helper that navigates calls it.
  Submit buttons ship disabled until hydration, so Playwright already waits
  before *clicking* — but the fields are controlled inputs, and text typed into
  one before React takes over gets wiped.
- Vitest and Playwright both claim `*.spec.ts` by default. `vitest.config.ts`
  excludes `e2e/`, so keep browser specs in this directory.
- Traces and screenshots are captured only on failure, into `test-results/`
  (gitignored). `pnpm exec playwright show-trace test-results/…/trace.zip`.
