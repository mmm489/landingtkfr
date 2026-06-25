import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('form disables native validation so custom email errors render', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(html, /<form[^>]+id="cc_form"[^>]+novalidate/);
});
