# Static Cloudflare Landing Design

## Goal

Convert the provided PHP landing page into a static landing page that can be deployed on Cloudflare Pages.

The visual experience should stay close to the original ZIP landing: header, cloud-storage messaging, CTA buttons, language selector, modal, email field, generated code field behavior, validation, and campaign parameter forwarding.

## Constraints

- Do not use PHP or server-rendered language files.
- Do not include the large `error_log` files or duplicated `test1` copy from the ZIP.
- Keep the `password` parameter as an automatically generated random code. The user does not type this value.
- Submit the form with `GET` to `https://lp.secureaddefender.com/offer/mraf46ps83vm8uel/`.
- Preserve incoming tracking parameters where present.
- Target Cloudflare Pages static hosting.

## Architecture

The implementation will use plain static files:

- `index.html` for the landing markup and modal.
- `static/css/*` for the existing styles, with small fixes only if needed.
- `static/img/*` for the existing images and icons.
- `static/js/main.js` or a small new JS file for static behavior that used to be handled by PHP.

No build step is required. Cloudflare Pages can deploy the folder directly.

## Runtime Behavior

On page load:

- Detect the preferred language from `localStorage`, browser language, or default to Spanish.
- Render text from a JavaScript translations object instead of PHP `lang_*.php` includes.
- Generate a random 12-character alphanumeric code.
- Store that generated code in a hidden form input named `password`.

On CTA click:

- Open the modal.
- Focus or expose the email input.

On form submit:

- Validate that the email looks valid.
- Keep `account=appcloud`.
- Include `password=<generated-code>`.
- Copy through known campaign parameters from the current URL, including `offer_id`, `source`, `campaign_id`, `adgroup_id`, `device`, `creative`, `placement`, `keyword`, and `adposition` where available.
- Submit by `GET` to `https://lp.secureaddefender.com/offer/mraf46ps83vm8uel/`.

## Error Handling

- If email is empty or invalid, show the existing inline error and do not submit.
- If JavaScript is disabled, the page remains visible but the modal/form behavior may not work; this is acceptable for a static landing derived from a JS/PHP flow.
- The generated code is regenerated on each page load.

## Testing

- Open the static `index.html` locally or through a simple local server.
- Verify the page renders on desktop and mobile widths.
- Verify the language selector changes visible text.
- Verify CTA opens the modal.
- Verify invalid email blocks submission.
- Verify valid email builds the expected destination URL with `email`, generated `password`, `account`, and campaign parameters.

