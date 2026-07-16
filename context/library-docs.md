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

## Azure Blob Storage (`@azure/storage-blob`)

`src/lib/azure/blob.ts` uses **shared-key auth** via
`AZURE_STORAGE_CONNECTION_STRING` (`BlobServiceClient.fromConnectionString`) —
not the AAD/`ClientSecretCredential` approach used for Graph mail. This was a
deliberate switch (2026-07-09) from an earlier AAD-based design once local dev
was actually being set up with a connection string from the Storage account's
Access Keys blade rather than an RBAC role assignment; simpler to get working
for this project's stage. SAS URLs are generated with a
`StorageSharedKeyCredential` built by parsing the account name/key back out of
the same connection string (`generateBlobSASQueryParameters` needs a
credential object, not just the client) — the account key is stored in `.env`
and effectively used for both plumbing and SAS generation, unlike the
account-key-free approach used before. `uploadBlob` calls
`containerClient.createIfNotExists()` so the container doesn't need to be
created manually in the Portal first. Blob path:
`engagements/{engagementId}/{docType}/{filename}` inside the container named
by `AZURE_STORAGE_CONTAINER_NAME`.

## react-day-picker / date-fns (shadcn `Calendar` + `DatePicker`)

Both arrived automatically via `pnpm dlx shadcn@latest add calendar` (not a
manual `pnpm add`) — `Calendar` (`src/components/ui/calendar.tsx`) is generated
on top of `react-day-picker`; `src/components/ui/date-picker.tsx` uses
`date-fns`'s `format`/`parseISO` only, to convert between `Date` (what
`Calendar` works with) and the `yyyy-MM-dd` strings this project's Postgres
`date` columns use everywhere else. `calendar.tsx` and `date-picker.tsx` are
the two exceptions that are allowed to import these packages directly — they
*are* the wrapper. Application/feature code (forms, pages, everything outside
`components/ui/`) should never reach for `react-day-picker` or `date-fns`
directly — build on `DatePicker` instead.

## Drizzle casing

`drizzle.config.ts` and `src/lib/db/client.ts` both set `casing: "snake_case"` so JS
camelCase column names (e.g. `entraObjectId`) map to snake_case DB columns
(`entra_object_id`), matching `architecture.md`'s schema tables. Both places must agree —
the config controls migration generation, the client option controls runtime queries.
---
