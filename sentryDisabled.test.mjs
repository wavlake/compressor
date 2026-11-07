// Sentry must stay off for this legacy Lambda (2026-11-07).
// Run with `node --test sentryDisabled.test.mjs` (no install needed).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("./index.js", import.meta.url), "utf8");

test("the one Sentry init is disabled with no tracing", () => {
  const inits = [...src.matchAll(/Sentry\.(?:AWSLambda\.)?init\(\{([\s\S]*?)\}\);/g)];
  assert.equal(inits.length, 1);
  assert.match(inits[0][1], /^\s*enabled:\s*false,/m);
  assert.match(inits[0][1], /^\s*tracesSampleRate:\s*0,/m);
  assert.doesNotMatch(inits[0][1], /profilesSampleRate|tracesSampler/);
});
