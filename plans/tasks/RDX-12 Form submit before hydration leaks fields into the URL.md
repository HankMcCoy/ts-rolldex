---
status: done
blockedBy: []
---

Submitting a form before React hydrates does a native GET, reloading the page
with every field — **including passwords** — in the query string.

## Resolution

Fixed two ways. `Button` renders `type="submit"` disabled until hydrated
(`useHydrated` in `src/lib/hydration.ts`), so the native submit can't fire at
all; and all 12 `<form>` elements now carry `method="post"`, so even if one
did fire, the fields would never reach the URL.

Guarded by `e2e/forms.spec.ts`, which asserts against the raw SSR HTML — no
browser, nothing hydrated — that the form is POST and the submit button ships
disabled.

## Notes

Reproduced on `/register` by a Playwright run that clicked faster than
hydration on a cold Vite start. Result:

```
/register?name=E2E+e2e&email=…%40example.test
  &password=playwright-test-password&confirmPassword=playwright-test-password
```

The SSR'd markup is a complete `<form>` with no `method` or `action`, and
`onSubmit` only exists once React attaches. Until then the browser falls back
to its default: GET to the current URL with the fields as query params.

Why it matters beyond the test being flaky — a submitted password ends up in:

- the address bar and browser history
- the `Referer` header on any subsequent request from that page
- server and proxy access logs

It needs a slow first paint to hit, so it's unlikely in production but not
impossible on a cold cache or a bad connection. `/login` has the same shape.

Options, roughly in order of preference:

- Disable the submit button until hydration, so a pre-hydration click does
  nothing. Cheapest and covers every form at once if it goes in the shared
  `Form` component.
- Give the forms `method="post"`, which at least keeps credentials out of the
  URL when the fallback fires.
- Both.

`e2e/helpers/auth.ts` has a `waitForHydration` gate that works around this for
tests. That's a test-side mitigation, not a fix — it makes the tests
deterministic and does nothing for real users.
