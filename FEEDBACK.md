# Product Feedback — tools, APIs, SDKs used

## @beeai/cli 0.7.3 (Bee SDK)
- Used for: the entire Bee track integration — `createBeeClient()` from `@beeai/cli/lib`, then `api.now()`, `api.todos.list()`, `api.daily.list()`.
- What worked: `npm i @beeai/cli` installed clean; the typed `BeeClient`/`DataApi` surface is genuinely pleasant — `api.todos.list<T>()` etc. are discoverable and the MCP/CLI share the same data model.
- What needs work: the `DataApi` generics default to `unknown` with no documented JSON shapes, so every consumer writes defensive parsers (ours is ~60 lines of shape-tolerant parsing). Published response schemas or zod types would remove a whole class of guesswork. The package's `exports` map has no `require` condition — only `import` — which forces ESM on consumers; a dual build would be friendlier.
- Onboarding: README is thorough (commands, MCP, proxy auth). The Developer-Mode-via-5-taps step is undiscoverable without reading the docs.
- Would build with it again: yes.

## vitest
- Used for: all 37 unit/integration tests.
- What worked: zero-config ESM TypeScript, fast (~1.4s for the suite), clear diffs on failure.
- What needs work: nothing hit during this build.
- Would use again: yes.

## tsx
- Used for: `npm run demo` — runs TypeScript directly, no build step.
- What worked: flawless with NodeNext ESM + `.js` import extensions.
- Would use again: yes.

## typescript 5.6 (NodeNext, strict)
- Used for: `npm run typecheck`.
- What worked: caught every cross-module mismatch during the build (including one bad test expectation of ours — see FRICTION_LOG).
- Would use again: yes.
