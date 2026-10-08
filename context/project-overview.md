# Project Overview

## About the Project

GMC Site Access digitizes foreign visitor and expatriate site-access registration at Ghana Manganese Company. Visitors are record subjects only — they do not log in, except to open an invitation link and submit the pre-registration form in a token-gated session.

The workflow begins with the **Department Head**, who generates an **invitation link** in the invitation console and emails it to the visitor: Microsoft Entra ID → 4-digit PIN → role-based dashboard. **The visitor opens that link to reach the pre-registration form — the page is public, but submission requires a valid, unrevoked link.** Only System-Admin-provisioned users get past `/unauthorized`.

Each visit is an **Engagement** (created at Reception, not before) routed through workflow layers based on access purpose set at Reception. Admin (write) and Guest (read-only) at each layer. Every action triggers dashboard + email notification and is audit-logged.

---

## Pages

```
/                         → PUBLIC pre-registration form (no auth); submit
                            enabled only with a valid invitation token
/?token=<invitation>      → token-gated submission session (GMC Liaison
                            Department injected from the link)
/(auth)/*          → Microsoft sign-in, PIN, unauthorized
/dashboard/department     → Department Head invitation console
/dashboard/[layer]        → workflow queue for assigned role
```

Layer values: `department`, `reception`, `hospital`, `training`, `security`, `it`, `admin` (System Admin user management).

The auth boundary (Entra ID + PIN + role middleware) sits **between** `/` and `/dashboard/department` — `/` has zero auth, **but its submit action is gated by the invitation token**; everything from `department` onward requires staff auth.

---

## Navigation

Staff see dashboard navigation for their assigned workflow role(s). **A Department Head's dashboard is the invitation console — generate links, resend, and revoke.** System Administrators additionally access user provisioning and termination approval.

Public pages: `/` only. No other public pages.

---

## Core User Flow
### Step 0 — Department Head: Issue Invitation

- Department Head signs in (Entra ID → PIN) and generates an invitation link in the invitation console
- The link is emailed to the visitor and carries the GMC Liaison Department it was issued for
- No expiry once issued; the Department Head revokes the link to stop further submissions
- The link stays valid until revoked — any holder may submit with it (not restricted to the invited address)
- Link states: outstanding | used | revoked

### Step 0 (cont.) — Invited Submission

- Anyone (no login) may open `/`; **submission is disabled unless the URL carries a valid, unrevoked invitation token**
- Without a valid link the form is visible but read-only, with an inline message: "You need an invitation link from the GMC Liaison Department"

- The GMC Liaison Department is injected from the invitation link — the visitor does not select it. It is a closed, canonical list; the list itself is defined separately, not in this document

- Triggers dashboard + email notification to the **Department Head who issued the invitation**

### Step 1 — Department

- Workflow layer staffed by the **Department Head**, whose only function is the invitation console
- Admin at this layer can perform exactly **one write action: Issue Invitation** (generate + email the link)
- Generated links are listed with their state; Admin can **revoke** an outstanding link
- Everything else at this layer is **read-only**, including for Admin — no edit action on submitted data, no reject action
- On invited submission: Registration Request status → `Approved`, forwarded to Reception; dashboard + email notification sent to Reception
- The HOD's decision point is **before** the visitor acts — declining is simply not issuing a link (no explicit rejected state)

### Step 2 onward

Records route at Reception by **access purpose** and (for visitors) **mine-site access**:

| Access purpose | Mine site | Path (from invitation → submission) |
|---|---|---|
| Coming to work | Yes | Reception → Hospital → Training School → Security → IT |
| Coming to visit | No | Reception only |
| Coming to visit | Yes | Reception → Training School → Security → IT |

No layer acts before the previous required layer completes. This applies to all three access-purpose paths.


### Reception

- Receptionist types passport number (manual lookup — no OCR) — unchanged; an approved Registration Request does not bypass manual lookup
- System pre-fills or creates Person, creates new Engagement
- The approved Registration Request's Sections 1–4 data is attached to the Engagement as reference/evidence only — Receptionist still confirms and re-enters data manually, consistent with the existing "evidence only, no auto-fill" rule
- Captures access purpose and mine-site flag (determines path)
- Receptionist marks which document uploads apply; only those are required
- Document types: `passport_biodata`, `visa`, `permit`, `insurance`
- Stakeholder approval: HCM, GMM, DMD notified together; any one approval advances the record
- Can initiate access termination requests


### Hospital

- Work path only
- Upload fitness form (`hospital_fitness_form`); record clearance status + doctor comments
- Fit / FitWithConditions → Training School
- Unfit → stays at Hospital; Reception notified
- Clearance valid three months while record is at Training School

### Training School

- Work path: after Hospital clearance
- Visit + mine site: directly from Reception (Hospital skipped)
- Records induction completion → Security
- Document types: induction records
- Work path: if not completed within three months of hospital clearance, progress archived, record returns to Hospital


### Security

- Work and visit + mine site paths
- Audits prior layers → forwards to IT for biometric enrollment

### Information Technology

- Biometric enrollment and access/visitor cards
- Document types: `biometric_image`, `passport_photo`
- Sets access active on success; notifies Security and Reception
- Revokes access on approved termination


### Visa / permit expiry

- System flags expired visa/permit → record resets to Reception
- Prior layer data read-only until Reception clears flag

### Access termination

- Reception requests → System Administrator approves → IT revokes

---

## Data Architecture

### Invitation *(new)*

- Created by the **Department Head** in the invitation console — the HOD's act of issuing the link is the visit approval
- Carries `gmc_liaison_department`, the issuing staff user, the recipient email, and the token
- `state`: `outstanding` | `used` | `revoked`; no expiry once issued
- Revocation immediately blocks further submissions from that link
- Not an Engagement — carries no `workflow_state` / `access_state`
- Submission is idempotent — one invitation admits one Registration Request

### Registration Request *(new)*

- Created only by submission from a valid, unrevoked invitation; the form route `/` is public but its submit action is token-gated
- Holds Sections 1–4 data + `gmc_liaison_department` **injected from the link** (drawn from the canonical department list once defined — not free text)
- `status`: `Submitted` | `Approved` (`Submitted` at creation; `Approved` on invited submission, since the invitation is the approval)
- No documents attached
- Not an Engagement — has no `workflow_state` / `access_state`
- Forwarded to Reception as reference data; Reception's manual passport lookup and Engagement creation proceed as before

### Person

- Reused visitor identity; keyed by `passport_no`
- Holds biodata only — not the centre of workflow
- Does not own per-visit documents

### Engagement

- One visit / work request — **aggregate root**
- Owns documents, stakeholder approvals, workflow cycles, transitions, termination requests
- `workflow_state` — where the record is in the handoff chain
- `access_state` — whether site access is pending, active, or terminated
- Fresh documents uploaded every engagement
- Created at Reception, not before

### StaffUser

- GMC employee — Entra ID + PIN + system role + workflow roles
- Lives in `staff_users` table

---

## Business Rules

Rules agents must enforce — referenced from services and guards:

- `/` is public to view — no auth, no PIN; submission requires a valid, unrevoked invitation token
- Auth boundary (Entra ID + PIN + role middleware) applies to everything from the Department layer onward
- Department layer: Admin's only permitted write actions are **Issue Invitation** and **Revoke Invitation**; no reject action exists; all other interaction is read-only, even for Admin
- Fresh documents every engagement — never attach visit docs to Person alone
- Passport lookup is manual — Receptionist types passport number; no OCR
- Passport biodata upload is evidence only — does not auto-fill form fields
- `is_visa_flagged` blocks all layer writes until Reception clears
- Guests cannot write — Admin required for all mutations
- No layer acts before the previous required layer completes
- Access card expiry ≤ visa/permit end or departure date (whichever is earlier)
- Registration Request approval is idempotent — repeated or concurrent approvals never
  double-transition the record or send a duplicate notification to Reception
- GMC Liaison Department is a closed, canonical list shared by Reception's form and the public
  Registration form — not free text; department heads are seeded for every value on that list
  ahead of go-live

---

## Roles

### System roles

| Role | Access |
|---|---|
| System Administrator | Provisions users, assigns roles, resets PINs, approves termination |
| Admin | Creates and processes records at assigned layer |
| Guest | Read-only at assigned layer |
| User | Microsoft sign-in only — not provisioned |

### Workflow roles

| Role | Department |
|---|---|
| Department Head | Department *(new — issues and revokes invitation links for their GMC Liaison Department)* |
| Receptionist | Reception |
| HCM / GMM / DMD | Reception (stakeholder approval) |
| Hospital Records Staff | Hospital |
| Training School Staff | Training School |
| Security Staff | Security |
| Information Technology Staff | IT |

---

## Features In Scope

- Public pre-registration form (/) — Sections 1–4, no uploads; viewable by anyone, submittable only with an invitation token
- Department Head invitation console — generate, email, and revoke invitation links
- Auth subsystem (Entra ID + PIN + middleware pipeline)
- Role-based access (system roles + workflow roles)
- Path-based workflow routing (work, visit-only, visit + mine site)
- Multi-section forms with per-layer validation
- Applicable document selection at Reception
- Compulsory uploads at Hospital, Training, IT
- Stakeholder approval (HCM / GMM / DMD) + delegated approval fallback
- Dashboard and email notifications on every action
- Visa/permit expiry flagging and Reception reset
- Access termination workflow
- Full audit logging
- Guest read-only per layer
- Foreign visitor and expatriate registration

## Features Out of Scope

- Local visitor registration
- Mobile native app
- SMS or push notifications
- External integrations (HR, ERP, biometric hardware, physical access control)
- Self-service PIN reset
- Automated reporting and analytics dashboards
- Bulk import or batch processing
- Public visitor self-registration
- Accommodation, transport, or airport pickup booking
