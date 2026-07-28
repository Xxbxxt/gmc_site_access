# Project Overview

## About the Project

GMC Site Access digitizes foreign visitor and expatriate site-access registration at Ghana Manganese Company. Visitors are record subjects only — they do not log in, except to submit the public pre-registration form.

The workflow now begins with a **public, unauthenticated pre-registration form**. From there, GMC staff take over, starting with the **Department Head**: Microsoft Entra ID → 4-digit PIN → role-based dashboard. Only System-Admin-provisioned users get past `/unauthorized`.

Each visit is an **Engagement** (created at Reception, not before) routed through workflow layers based on access purpose set at Reception. Admin (write) and Guest (read-only) at each layer. Every action triggers dashboard + email notification and is audit-logged.

---

## Pages

```
/                         → redirect to dashboard or sign-in (staff)
/register                 → PUBLIC pre-registration form (no auth)
/(auth)/*                 → Microsoft sign-in, PIN, unauthorized
/dashboard/[layer]        → workflow queue for assigned role
```

Layer values: `department`, `reception`, `hospital`, `training`, `security`, `it`, `admin` (System Admin user management).

The auth boundary (Entra ID + PIN + role middleware) sits **between** `/register` and `/dashboard/department` — `/register` has zero auth; everything from `department` onward requires staff auth.

---

## Navigation

Staff see dashboard navigation for their assigned workflow role(s). System Administrators additionally access user provisioning and termination approval.

Public pages: `/register` only. No other public pages.

---

## Core User Flow
### Step 0 — Public Pre-Registration

- Anyone (no login) accesses `/register` via URL
- Fills in Sections 1–4 of the Reception form (data entry only — no document uploads at this stage)
- Selects a **GMC Liaison Department** (determines which Department Head is notified)
- Submits — creates a **Registration Request** with status `pending_department_approval`
- Does **not** create a Person or Engagement yet
- Triggers dashboard + email notification to the relevant Department Head

### Step 1 — Department

- New workflow layer, staffed by a new role: **Department Head**
- Admin at this layer can perform exactly **one write action: Approve**
- Everything else at this layer is **read-only**, including for Admin — no edit action, no reject action
- "Rejection" = the Department Head simply leaves the Registration Request untouched (no explicit rejected state)
- On Approve: Registration Request status → `approved`, forwarded to Reception; dashboard + email notification sent to Reception

### Step 2 onward

Records route at Reception by **access purpose** and (for visitors) **mine-site access**:

| Access purpose | Mine site | Path (from Department approval) |
|---|---|---|
| Coming to work | Yes | Department → Reception → Hospital → Training School → Security → IT |
| Coming to visit | No | Department → Reception only |
| Coming to visit | Yes | Department → Reception → Training School → Security → IT |

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

### Registration Request *(new)*

- Created by public, unauthenticated submission at `/register`
- Holds Sections 1–4 data + selected `gmc_liaison_department`
- `status`: `pending_department_approval` | `approved`
- No documents attached
- Not an Engagement — has no `workflow_state` / `access_state`
- On approval, forwarded to Reception as reference data; Reception's manual passport lookup and Engagement creation proceed as before

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

- `/register` is fully public — no auth, no PIN, accessible to all
- Auth boundary (Entra ID + PIN + role middleware) applies to everything from the Department layer onward
- Department layer: Admin's only permitted write action is **Approve**; no reject action exists; all other interaction is read-only, even for Admin
- Fresh documents every engagement — never attach visit docs to Person alone
- Passport lookup is manual — Receptionist types passport number; no OCR
- Passport biodata upload is evidence only — does not auto-fill form fields
- `is_visa_flagged` blocks all layer writes until Reception clears
- Guests cannot write — Admin required for all mutations
- No layer acts before the previous required layer completes
- Access card expiry ≤ visa/permit end or departure date (whichever is earlier)

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
| Department Head | Department *(new — approves Registration Requests for their GMC Liaison Department)* |
| Receptionist | Reception |
| HCM / GMM / DMD | Reception (stakeholder approval) |
| Hospital Records Staff | Hospital |
| Training School Staff | Training School |
| Security Staff | Security |
| Information Technology Staff | IT |

---

## Features In Scope

- Public, unauthenticated pre-registration form (`/register`) — Sections 1–4, no uploads
- Department layer with Department Head role — approve-only write action, read-only otherwise
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
