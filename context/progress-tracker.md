# Progress Tracker

Update this file after each slice is complete. Mark components done as they are built — not
in bulk at the end of a slice.
Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Step 0 — Scaffold ✅

- [x] Next.js 16, TypeScript strict, Tailwind, shadcn/ui, pnpm
- [x] Docker Compose PostgreSQL
- [x] Drizzle ORM configured; `src/lib/db/` in place
- [x] `.env.example` with `DATABASE_URL`
- [x] `@/` alias resolves to `./src/`
- [x] Branded landing page

---

## Slice 1 — Auth ✅

**Spec:** `docs/superpowers/specs/2026-06-30-slice-1-auth-design.md`
**Reviewed:** 2026-07-09 — see `/review` findings; architecture-boundary gap
(Server Actions/Server Components querying Drizzle directly) and a cold-provisioning
UI bug were both fixed as part of this slice's closeout.

### Schema
- [x] `staff_users` table
- [x] `notifications` table
- [x] `notifications.requester_staff_user_id` — replaces email-substring matching for
      access-request tracking

### Seed
- [x] `src/lib/db/seed.ts` — first System Admin

### Email infrastructure
- [x] `src/lib/azure/graph-mail.ts`
- [x] `src/lib/email/send.ts`
- [x] `src/lib/email/templates.ts` (auth templates)

### UI tokens
- [x] `context/ui-tokens.md` filled
- [x] shadcn/ui base components installed (Button, Input, Label, Card, Form, Alert
      — plus DropdownMenu, Sonner, Avatar, Breadcrumb, Table, RadioGroup, Badge,
      Dialog for the System Admin UI and dashboard shell)
- [x] `context/ui-registry.md` updated

### Auth library
- [x] `src/lib/domain/types.ts` (SystemRole, WorkflowRole)
- [x] `src/lib/auth/entra.ts`
- [x] `src/lib/auth/pin.ts` (also owns `setPinHash`/`resetPin` — PIN persistence
      stays inside the `lib/auth/` boundary rather than a generic service)
- [x] `src/lib/auth/session.ts`
- [x] `src/lib/auth/guards.ts`
- [x] `src/app/api/auth/[...nextauth]/route.ts`
- [x] `src/proxy.ts` (Next 16 renamed `middleware` → `proxy`)

### Services (added during review closeout — Server Actions/Components no
longer query Drizzle directly, per `architecture.md`'s invariants)
- [x] `src/lib/services/auth-service.ts` — staff user lookups, access-request
      logic, provisioning
- [x] `src/lib/services/notification-service.ts` — unread count, recent list,
      mark-read

### Pages
- [x] `src/app/(auth)/sign-in/page.tsx`
- [x] `src/app/(auth)/pin/page.tsx`
- [x] `src/app/(auth)/pin/setup/page.tsx`
- [x] `src/app/(auth)/unauthorized/page.tsx`
- [x] `src/app/(auth)/unauthorized/session-refresher.tsx` — auto-refreshes a stale
      session when the DB shows the user was provisioned while their JWT still
      said `User`, redirecting to `/pin` or `/pin/setup` without a click

### System Admin (minimal)
- [x] `src/app/dashboard/system-admin/users/page.tsx`
- [x] `src/app/dashboard/system-admin/layout.tsx`

### Server Actions
- [x] `src/actions/auth.ts` (requestAccess, verifyPin, setupPin)
- [x] `src/actions/auth.ts` — `refreshSessionAction` (patches a live JWT with fresh
      `systemRole`/`workflowRoles` after out-of-band provisioning)
- [x] `src/actions/admin.ts` (provisionUser — sets system_role + workflow_roles in
      one call; resetPin)

### Verification
- [x] Full auth loop verified end-to-end via code review (see spec Done When
      checklist) — live Entra ID sign-in still requires the Developer Steps in
      the spec (App Registration, `.env.local`)
- [x] `tsc --noEmit` clean

---

## Slice 2 — Reception 🔲

*Not started. Start after Slice 1 verification is complete.*

---

## Slice 3 — Hospital 🔲

*Not started.*

---

## Slice 4 — Training School 🔲

*Not started.*

---

## Slice 5 — Security 🔲

*Not started.*

---

## Slice 6 — IT 🔲

*Not started.*

---

## Slice 7 — Access Termination 🔲

*Not started.*

---

## Slice 8 — Visa / Permit Expiry Flagging 🔲

*Not started.*

---

## Slice 9 — Hospital Timeout 🔲

*Not started.*

---

## Slice 10 — Async Email 🔲

*Not started.*
