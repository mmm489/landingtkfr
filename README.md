# Static Cloudflare Landing

Static landing page converted from the provided PHP ZIP for Cloudflare Pages.

## Local Checks

```powershell
npm test
python -m http.server 8787
```

Open:

```text
http://localhost:8787/?gclid=abc123&utm_source=google&email=old@example.com&account=appcloud&custom=value
```

The form redirects to:

```text
https://lp.secureaddefender.com/offer/mraf46ps83vm8uel/
```

It forwards all incoming query parameters, removes `email` and `account`, and adds:

- `sub4` with the submitted email.
- `password` with a generated 12-character alphanumeric code.

## Cloudflare Pages

Use these settings:

- Framework preset: `None`
- Build command: leave empty
- Build output directory: `/`

