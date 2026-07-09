# Library Docs

Project-specific usage for third-party libraries and environment configuration. Read the relevant section before implementing a feature that touches these.

For coding rules (try/catch, Server Actions, naming): see `context/code-standards.md`.

---

## Before Using Any Library

Before implementing any feature that uses a third party library:

1. **Check AGENTS.md** at the project root — it lists every skill installed for this project and how to use them. Skills contain up-to-date API documentation, usage patterns, and best practices specific to this codebase.

2. **Check if an MCP server is configured** for that library. Some tools have MCP servers that give the AI agent direct access to documentation, logs, and debugging tools. If an MCP server is available — use it before falling back to general knowledge.

3. **Read this file** for project-specific patterns that override general library knowledge.

The order of authority is:

```
MCP server (real-time docs) → Skills via AGENTS.md → This file (project rules) → General training knowledge
```

Never rely on general training knowledge alone for library APIs — they change frequently and training data may be outdated.

---

## Auth.js v5 (`next-auth@beta`)

`latest` on npm is still v4 — v5 only exists under the `beta` dist-tag. Install with
`pnpm add next-auth@beta`. Provider import: `next-auth/providers/microsoft-entra-id`
(not `azure-ad`); provider id used in `signIn()` calls is `'microsoft-entra-id'`.
Config lives at `src/lib/auth/entra.ts` (not the framework's suggested root `auth.ts`,
to match this project's `lib/auth/` convention) exporting `{ handlers, auth, signIn, signOut }`.

## Next.js 16 `proxy` (formerly `middleware`)

Next 16 deprecated `middleware.ts`/`export function middleware()` in favor of
`proxy.ts`/`export function proxy()`. Runtime is `nodejs` only — `edge` is no longer an
option for this file. This project's auth gate lives at `src/proxy.ts`.

## Microsoft Graph email (`@azure/identity`)

`src/lib/azure/graph-mail.ts` uses `ClientSecretCredential` (client-credentials flow) to
get a token for scope `https://graph.microsoft.com/.default`, then calls the Graph
`sendMail` REST endpoint directly via `fetch` — no `@microsoft/microsoft-graph-client` SDK
needed for this single call. Requires `Mail.Send` **Application** permission
(admin-consented) on the App Registration, separate from the delegated `User.Read`
permission used for sign-in.

## Drizzle casing

`drizzle.config.ts` and `src/lib/db/client.ts` both set `casing: "snake_case"` so JS
camelCase column names (e.g. `entraObjectId`) map to snake_case DB columns
(`entra_object_id`), matching `architecture.md`'s schema tables. Both places must agree —
the config controls migration generation, the client option controls runtime queries.
---
