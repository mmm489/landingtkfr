# Static Cloudflare Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static Cloudflare Pages-ready version of the PHP landing page from `C:\Users\Montane\Downloads\lp (2).zip`.

**Architecture:** The landing will be plain static HTML/CSS/JS. Browser JS replaces PHP language selection, generated password-code creation, modal behavior, email validation, and query-parameter forwarding. Parameter building will live in pure exported JS functions so it can be tested with Node before browser verification.

**Tech Stack:** HTML, CSS, browser JavaScript ES modules, Node built-in test runner, PowerShell for asset extraction.

## Global Constraints

- Do not use PHP or server-rendered language files.
- Do not include the large `error_log` files or duplicated `test1` copy from the ZIP.
- Keep the `password` parameter as an automatically generated random code. The user does not type this value.
- Submit the form with `GET` to `https://lp.secureaddefender.com/offer/mraf46ps83vm8uel/`.
- Preserve every incoming query parameter from Google Ads or any other source.
- Add `sub4=<email>` on submit. Do not send the email under an `email` parameter.
- Do not send an `account` parameter.
- Target Cloudflare Pages static hosting.

---

## File Structure

- `index.html`: Static landing markup, modal, form, language selector, and references to static assets.
- `static/css/foundation.min.css`: Copied from ZIP.
- `static/css/styles.css`: Copied from ZIP, then adjusted only if static markup needs small compatibility fixes.
- `static/css/custom.css`: Copied from ZIP.
- `static/css/joinform.css`: Copied from ZIP for modal/form styling.
- `static/css/fix-payment.css`: Copied from ZIP only if existing modal styles depend on it.
- `static/img/*`: Copied from ZIP root `static/img`.
- `static/js/landing.js`: New ES module containing translations, generated-code logic, modal/language behavior, form validation, and destination URL creation.
- `tests/landing.test.mjs`: Node tests for generated code, email validation, query forwarding, forbidden parameter removal, and destination URL construction.
- `README.md`: Cloudflare Pages deployment notes and local verification commands.

---

### Task 1: Extract Clean Static Assets

**Files:**
- Create: `static/css/foundation.min.css`
- Create: `static/css/styles.css`
- Create: `static/css/custom.css`
- Create: `static/css/joinform.css`
- Create: `static/css/fix-payment.css`
- Create: `static/img/*`

**Interfaces:**
- Consumes: `C:\Users\Montane\Downloads\lp (2).zip`
- Produces: local static assets referenced by `index.html`

- [ ] **Step 1: Extract only root static assets**

Run:

```powershell
$zip = 'C:\Users\Montane\Downloads\lp (2).zip'
$dest = 'C:\Users\Montane\OneDrive\Documentos\landing tornika'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($zip)
try {
  foreach ($entry in $archive.Entries) {
    if ($entry.FullName -like 'static/*' -and -not $entry.FullName.EndsWith('/')) {
      $target = Join-Path $dest $entry.FullName
      New-Item -ItemType Directory -Force -Path (Split-Path $target) | Out-Null
      [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $target, $true)
    }
  }
} finally {
  $archive.Dispose()
}
```

Expected: `static/css` and `static/img` exist, with no `error_log`, PHP files, or `test1` directory.

- [ ] **Step 2: Verify copied assets**

Run:

```powershell
Get-ChildItem -Recurse -File static | Select-Object FullName,Length
```

Expected: only files under `static/css`, `static/img`, and the original copied `static/js` files. Later tasks may remove unused copied JS and add `static/js/landing.js`.

---

### Task 2: Add Testable Landing Logic

**Files:**
- Create: `static/js/landing.js`
- Create: `tests/landing.test.mjs`

**Interfaces:**
- Produces:
  - `generateRandomCode(length?: number): string`
  - `isValidEmail(email: string): boolean`
  - `buildDestinationUrl(currentUrl: string, email: string, password: string): string`
  - `initLanding(): void`

- [ ] **Step 1: Write the failing tests**

Create `tests/landing.test.mjs`:

```javascript
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDestinationUrl,
  generateRandomCode,
  isValidEmail,
} from '../static/js/landing.js';

test('generateRandomCode creates a 12 character alphanumeric code by default', () => {
  const code = generateRandomCode();
  assert.equal(code.length, 12);
  assert.match(code, /^[A-Za-z0-9]+$/);
});

test('isValidEmail accepts normal addresses and rejects invalid input', () => {
  assert.equal(isValidEmail('buyer@example.com'), true);
  assert.equal(isValidEmail('bad@@example.com'), false);
  assert.equal(isValidEmail('missing-at.example.com'), false);
});

test('buildDestinationUrl forwards all incoming params and adds sub4/password', () => {
  const result = new URL(buildDestinationUrl(
    'https://landing.example/?gclid=abc123&utm_source=google&device=m&custom=value',
    'buyer@example.com',
    'AbC123xYz789',
  ));

  assert.equal(result.origin + result.pathname, 'https://lp.secureaddefender.com/offer/mraf46ps83vm8uel/');
  assert.equal(result.searchParams.get('gclid'), 'abc123');
  assert.equal(result.searchParams.get('utm_source'), 'google');
  assert.equal(result.searchParams.get('device'), 'm');
  assert.equal(result.searchParams.get('custom'), 'value');
  assert.equal(result.searchParams.get('sub4'), 'buyer@example.com');
  assert.equal(result.searchParams.get('password'), 'AbC123xYz789');
});

test('buildDestinationUrl removes email/account and overrides stale sub4/password', () => {
  const result = new URL(buildDestinationUrl(
    'https://landing.example/?email=old@example.com&account=appcloud&sub4=old&password=oldpass&wbraid=wb',
    'new@example.com',
    'NewPass12345',
  ));

  assert.equal(result.searchParams.has('email'), false);
  assert.equal(result.searchParams.has('account'), false);
  assert.equal(result.searchParams.get('sub4'), 'new@example.com');
  assert.equal(result.searchParams.get('password'), 'NewPass12345');
  assert.equal(result.searchParams.get('wbraid'), 'wb');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
node --test tests/landing.test.mjs
```

Expected: FAIL because `static/js/landing.js` does not exist yet or exports are missing.

- [ ] **Step 3: Implement `static/js/landing.js`**

Create `static/js/landing.js` with:

```javascript
const DESTINATION_URL = 'https://lp.secureaddefender.com/offer/mraf46ps83vm8uel/';
const LANGUAGE_STORAGE_KEY = 'safestorage_lang';
const CODE_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export const translations = {
  es: {
    title: 'Contenido ilimitado: comience ahora',
    banner_txt: 'Almacenamiento en la nube para Desktop y Smartphone. Almacenamiento de datos de 5 Tb incluido. Mantenga todos sus archivos seguros con el almacenamiento en linea.',
    mob_act: 'Movil <b>Activacion</b>',
    online_act: 'En linea <br><b>Activacion</b>',
    continue: 'Continuar',
    creating: 'Creando',
    email_input: 'Ingrese correo electronico',
    speed: 'Conexion de alta velocidad',
    sec_con: '<b>Segura</b><br> Conexion',
    unt_storage: '<b>Transferencia ilimitada</b><br>5 TB de almacenamiento en la nube',
    availability: 'Disponible<br> <b>En todos lados</b>',
    steps: 'Obtenga acceso en 3 sencillos pasos',
    create_account: 'Crear una cuenta',
    verify_account: 'Verificar Cuenta',
    get_access: 'Obtenga acceso a su contenido',
    get_started: 'Empezar',
    discover: 'Descubra por que cientos de personas se estan cambiando a nosotros',
    global_access: 'Acceso global desde cualquier dispositivo',
    storage: '5 TB de capacidad de almacenamiento en la nube',
    extra_speed: 'Velocidad adicional',
    invalid_email: 'La direccion de correo electronico es invalida',
    terms: 'Al hacer clic en "Continuar", acepta los Terminos y condiciones y la Politica de privacidad',
    modal_step: 'en 3 sencillos pasos',
    free_account: 'Crea tu cuenta gratuita',
  },
  en: {
    title: 'Content Without Limits - Begin today',
    banner_txt: 'Cloud storage for Desktop and Mobile. 5 Tb of Data Space included. Secure all your documents with our online storage.',
    mob_act: 'Mobile <b>Activation</b>',
    online_act: 'Web <br><b>Activation</b>',
    continue: 'Continue',
    creating: 'Generating',
    email_input: 'Enter your email',
    speed: 'Rapid Speed Connectivity',
    sec_con: '<b>Protected</b><br> Connection',
    unt_storage: '<b>Limitless transfer</b><br>5 TB of Cloud Space',
    availability: 'Accessible<br> <b>Anywhere</b>',
    steps: 'Gain Access in three simple steps',
    create_account: 'Register account',
    verify_account: 'Confirm account',
    get_access: 'Access your materials',
    get_started: 'Begin',
    discover: 'Find out why numerous individuals are transitioning to us',
    global_access: 'Worldwide entry from any gadget',
    storage: '5TB of cloud storage capability',
    extra_speed: 'Additional Velocity',
    invalid_email: 'The email input is invalid',
    terms: 'By pressing "Proceed", you consent to the Terms & Agreements and the Privacy Statement',
    modal_step: 'in three straightforward steps',
    free_account: 'Set up your complimentary account',
  },
};

export function generateRandomCode(length = 12) {
  const cryptoObj = globalThis.crypto;
  let result = '';

  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const values = new Uint32Array(length);
    cryptoObj.getRandomValues(values);
    for (const value of values) {
      result += CODE_CHARS[value % CODE_CHARS.length];
    }
    return result;
  }

  for (let i = 0; i < length; i += 1) {
    result += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return result;
}

export function isValidEmail(email) {
  return /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email);
}

export function buildDestinationUrl(currentUrl, email, password) {
  const current = new URL(currentUrl);
  const destination = new URL(DESTINATION_URL);

  current.searchParams.forEach((value, key) => {
    destination.searchParams.append(key, value);
  });

  destination.searchParams.delete('email');
  destination.searchParams.delete('account');
  destination.searchParams.set('sub4', email);
  destination.searchParams.set('password', password);

  return destination.toString();
}

function getPreferredLanguage() {
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved && translations[saved]) return saved;

  const browserLang = (navigator.language || 'es').slice(0, 2);
  return translations[browserLang] ? browserLang : 'es';
}

function applyLanguage(lang) {
  const dictionary = translations[lang] || translations.es;
  document.documentElement.lang = lang;
  document.title = dictionary.title;

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const key = node.getAttribute('data-i18n');
    if (dictionary[key]) node.innerHTML = dictionary[key];
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    const key = node.getAttribute('data-i18n-placeholder');
    if (dictionary[key]) node.setAttribute('placeholder', dictionary[key]);
  });
}

function openModal() {
  document.querySelector('.page')?.classList.add('blur', 'max-height');
  document.querySelector('.modal')?.classList.add('is-visible');
  setTimeout(() => document.querySelector('input[name="email"]')?.focus(), 80);
}

function closeModal() {
  document.querySelector('.page')?.classList.remove('blur', 'max-height');
  document.querySelector('.modal')?.classList.remove('is-visible');
}

export function initLanding() {
  const generatedPassword = generateRandomCode();
  const langSelector = document.querySelector('#lang_selector');
  const form = document.querySelector('#cc_form');
  const emailInput = document.querySelector('input[name="email"]');
  const error = document.querySelector('.error.email-wrong');

  const initialLang = getPreferredLanguage();
  if (langSelector) langSelector.value = initialLang;
  applyLanguage(initialLang);

  langSelector?.addEventListener('change', (event) => {
    const nextLang = event.target.value;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLang);
    applyLanguage(nextLang);
  });

  document.querySelectorAll('.click').forEach((node) => {
    node.addEventListener('click', (event) => {
      event.preventDefault();
      openModal();
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach((node) => {
    node.addEventListener('click', closeModal);
  });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = emailInput?.value.trim() || '';

    if (!isValidEmail(email)) {
      emailInput?.classList.add('input-error');
      if (error) error.style.display = 'block';
      return;
    }

    emailInput?.classList.remove('input-error');
    if (error) error.style.display = 'none';
    window.location.href = buildDestinationUrl(window.location.href, email, generatedPassword);
  });
}
```

- [ ] **Step 4: Run tests to verify logic passes**

Run:

```powershell
node --test tests/landing.test.mjs
```

Expected: PASS for all four tests.

---

### Task 3: Build Static HTML Landing

**Files:**
- Create: `index.html`
- Modify: `static/css/custom.css`

**Interfaces:**
- Consumes: `static/js/landing.js` exports `initLanding()`
- Produces: Cloudflare Pages entrypoint at `index.html`

- [ ] **Step 1: Create the static HTML entrypoint**

Create `index.html` with static markup equivalent to the original landing, using `data-i18n` attributes for dynamic text and this form shape:

```html
<form method="get" action="https://lp.secureaddefender.com/offer/mraf46ps83vm8uel/" id="cc_form">
  <div class="field mail">
    <input type="email" name="email" data-i18n-placeholder="email_input" value="">
    <div class="error email-wrong" data-i18n="invalid_email"></div>
  </div>
  <button class="btn-submit" type="submit" data-i18n="continue"></button>
</form>
```

The form uses `name="email"` only for local browser input. `static/js/landing.js` prevents the default submit and redirects with `sub4` instead of `email`.

- [ ] **Step 2: Add modal visibility CSS**

Append to `static/css/custom.css`:

```css
.modal {
  display: none;
}

.modal.is-visible {
  display: block;
}

.modal .overlay {
  cursor: pointer;
}
```

- [ ] **Step 3: Wire the ES module**

Add before `</body>`:

```html
<script type="module">
  import { initLanding } from './static/js/landing.js';
  initLanding();
</script>
```

Expected: the page loads without PHP, and text renders after JS applies the selected language.

---

### Task 4: Verify Locally

**Files:**
- Read: `index.html`
- Read: `static/js/landing.js`
- Read: `tests/landing.test.mjs`

**Interfaces:**
- Consumes: static site from Tasks 1-3
- Produces: confidence that Cloudflare Pages can host it

- [ ] **Step 1: Run unit tests**

Run:

```powershell
node --test tests/landing.test.mjs
```

Expected: all tests pass.

- [ ] **Step 2: Start a local static server**

Run:

```powershell
python -m http.server 8787
```

Expected: server listens on `http://localhost:8787`.

- [ ] **Step 3: Verify manually in browser**

Open:

```text
http://localhost:8787/?gclid=abc123&utm_source=google&email=old@example.com&account=appcloud&custom=value
```

Expected:
- Landing renders with logo/images/styles.
- CTA opens modal.
- Invalid email shows error.
- Valid email redirects to `https://lp.secureaddefender.com/offer/mraf46ps83vm8uel/?gclid=abc123&utm_source=google&custom=value&sub4=<email>&password=<generated>`.
- Redirect URL does not include `email` or `account`.

---

### Task 5: Publish to GitHub

**Files:**
- Read: all created static files
- Modify: git remote config

**Interfaces:**
- Consumes: verified local git repo
- Produces: pushed branch on `https://github.com/mmm489/landingtkfr.git`

- [ ] **Step 1: Check git status**

Run:

```powershell
git status --short --branch
```

Expected: only intentional static landing files are modified/untracked.

- [ ] **Step 2: Commit implementation**

Run:

```powershell
git add -- index.html static tests README.md docs/superpowers/plans/2026-06-25-static-cloudflare-landing.md
git commit -m "Build static Cloudflare landing"
```

Expected: commit succeeds.

- [ ] **Step 3: Configure GitHub remote**

Run:

```powershell
git remote add origin https://github.com/mmm489/landingtkfr.git
```

If `origin` already exists, run:

```powershell
git remote set-url origin https://github.com/mmm489/landingtkfr.git
```

- [ ] **Step 4: Push to GitHub**

Run:

```powershell
git push -u origin master
```

Expected: branch uploads to `mmm489/landingtkfr.git`.

---

## Self-Review

- Spec coverage: Tasks cover PHP removal, clean asset extraction, static language rendering, random generated `password`, forwarding all incoming query params, adding `sub4`, removing `email/account`, Cloudflare static hosting, tests, and GitHub push.
- Placeholder scan: No `TBD`, `TODO`, or unspecified implementation steps remain.
- Type consistency: `generateRandomCode`, `isValidEmail`, `buildDestinationUrl`, and `initLanding` are defined in Task 2 and consumed consistently by tests and HTML.

