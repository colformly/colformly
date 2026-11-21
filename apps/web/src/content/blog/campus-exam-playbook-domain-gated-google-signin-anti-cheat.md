---
title: "The 2026 Campus Exam Playbook: Domain-Gated Google Sign-In, Ghost Handover & Anti-Cheat Governance for Institutions"
description: "A complete governance playbook for university IT directors: how institutional domain gating, Super Admin provisioning, and Ghost Handover eliminate exam fraud."
publishDate: "2026-11-21"
author: "Campus Governance & Security Advisory"
authorRole: "Institutional Policy & Compliance"
category: "Campus Governance"
tags: ["Campus Governance", "University IT", "Google Workspace", "Multi-Tenant SaaS", "EdTech Security"]
readingTime: "13 min read"
heroImage: "/images/blog/campus-domain-gate-governance.svg"
heroImageAlt: "Campus domain gatekeeper and ghost handover lifecycle architecture diagram"
tldr:
  - "Allowing students to authenticate with personal Gmail accounts opens major attack vectors, including proxy test-taking, credential spoofing, and rogue account sharing."
  - "Colformly's server-side domain gate validates the institutional hosted domain ('hd') claim directly from cryptographically signed Google ID tokens, rejecting unauthorized domains."
  - "The Super Admin 'Ghost Handover' lifecycle allows central IT to provision colleges, departments, and faculty in 'Setup Mode' before transferring complete autonomy to academic deans."
  - "Faculty Google OAuth refresh tokens are encrypted at rest using AES-256-GCM authenticated encryption, ensuring zero credential leakage across multi-tenant boundaries."
keyStats:
  - label: "Domain Spoofing Risk"
    value: "0% Server-Gated"
  - label: "Token Vault Security"
    value: "AES-256-GCM Encrypted"
  - label: "Handover Downtime"
    value: "0 Seconds (Atomic)"
  - label: "Faculty Onboarding Time"
    value: "<3 Minutes"
faqs:
  - question: "Why is personal Gmail authentication dangerous for college examinations?"
    answer: "When students take exams using personal Gmail addresses (e.g., student.exam@gmail.com), university IT teams lose all auditability. Students can easily share credentials with off-campus proxies, create duplicate accounts to preview questions, or claim identity confusion. Enforcing strict institutional domain matching ensures only enrolled students with verified university credentials can enter."
  - question: "How does Colformly verify student university domains without relying on frontend checks?"
    answer: "Colformly validates the Google OAuth 2.0 ID token on the server inside Cloudflare Edge Workers and Supabase Auth. The token's cryptographically signed payload contains the 'hd' (hosted domain) claim. The server checks this claim against the organization's allowed_domains array in public.organizations, instantly blocking tokens from unauthorized domains."
  - question: "What is the Super Admin 'Ghost Handover' workflow?"
    answer: "Ghost Handover is an institutional provisioning lifecycle where a university IT administrator or partner creates an organization in 'SETUP_MODE'. The admin configures campus settings, seeds departments, verifies institutional domains, and invites initial faculty. Once verified, the admin triggers an atomic handover to the university's academic director, locking the setup admin out and granting full administrative sovereignty to the institution."
  - question: "How are faculty Google OAuth tokens stored and protected?"
    answer: "Faculty Google OAuth refresh and access tokens are stored in the public.google_credentials table with row-level encryption using AES-256-GCM. The encryption key is held securely in Cloudflare Worker and server environment secrets, meaning raw tokens are never exposed to client browsers or visible in plain text inside database backups."
  - question: "Can a university support both student Google Sign-In and faculty email/password login?"
    answer: "Yes. Colformly supports granular per-organization authentication policies. In public.organizations, administrators can set student_auth_mode to 'GOOGLE_ONLY' (enforcing institutional domains) while allowing teacher_auth_mode to be 'BOTH' or 'EMAIL_PASSWORD' to accommodate adjunct faculty or external examiners."
---

## The Governance Crisis in Campus Digital Testing

In the rush toward digital campus transformation, higher education institutions—from state universities to premier engineering academies—have rapidly adopted cloud-based assessment tools. Yet, university IT directors and academic deans repeatedly face a recurring governance breakdown:

- Students logging into exams using personal Gmail accounts (`rahul.coder99@gmail.com`) instead of their assigned institutional roll numbers (`22cs104@engg.edu.in`).
- Third-party test-taking proxies operating from remote locations, impossible to detect because the exam system accepted any valid Google sign-in.
- Fragmented faculty silos where professors store student answer sheets across dozens of unmanaged personal Google Drives, violating national accreditation guidelines and student privacy laws.
- Clunky multi-tenant software that requires hours of manual CSV user provisioning before every single exam cycle.

Digital examination integrity is not merely a question of blocking browser keyboard shortcuts; **it is an institutional governance challenge**.

This playbook details the architectural framework, identity workflows, and governance policies required to deploy digital exams across multi-college campuses with ironclad security, effortless faculty onboarding, and zero data leakage.

---

## 1. The Campus Domain Gate: Eliminating Proxy Authentication

The first and most critical perimeter in campus exam security is **identity provenance**.

![Campus Domain Gate & Ghost Handover Architecture](/images/blog/campus-domain-gate-governance.svg)

### The Flaw of Client-Side Domain Filtering
Many digital assessment platforms attempt to enforce email domain restrictions in the client-side JavaScript bundle:

```javascript
// NAIVE CLIENT-SIDE CHECK (TRIVIAL TO BYPASS)
const userEmail = user.email;
if (!userEmail.endsWith('@college.edu.in')) {
  alert('Please sign in with your official college email!');
  return;
}
```

Any student using browser developer tools or a network proxy can modify this check, swap the email string in local storage, or replay authentication tokens to enter the assessment hall undetected.

### Cryptographic Server-Side Hosted Domain (`hd`) Verification
Colformly eliminates this vulnerability by validating the Google OAuth 2.0 ID token cryptographically at the server level.

When a student authenticates via Google Sign-In, Google’s OpenID Connect provider signs the identity token with Google's private key. In addition to standard email and sub claims, Google Workspace tokens include the **`hd` (Hosted Domain)** claim:

```json
{
  "iss": "https://accounts.google.com",
  "sub": "109823746198273645",
  "email": "2026.cs.arav@mitwpu.edu.in",
  "email_verified": true,
  "hd": "mitwpu.edu.in",
  "exp": 1795328400
}
```

In Colformly’s database schema and Cloudflare edge middleware, the organization’s allowed domains are enforced at the database level:

```sql
-- Schema excerpt from public.organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS allowed_domains text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS student_auth_mode text NOT NULL DEFAULT 'GOOGLE_ONLY'
    CHECK (student_auth_mode IN ('GOOGLE_ONLY', 'EMAIL_PASSWORD', 'BOTH')),
  ADD COLUMN IF NOT EXISTS teacher_auth_mode text NOT NULL DEFAULT 'BOTH'
    CHECK (teacher_auth_mode IN ('GOOGLE_ONLY', 'EMAIL_PASSWORD', 'BOTH'));
```

When the student requests access to an assessment session, the server-side auth gate executes:

```typescript
// Server-side identity boundary in Cloudflare Worker
export async function verifyStudentAccess(
  token: string, 
  instituteCode: string, 
  env: Env
): Promise<{ authorized: boolean; studentEmail: string }> {
  // 1. Verify token signature with Google's public JWKS keys
  const idTokenPayload = await verifyGoogleIdToken(token, env.GOOGLE_CLIENT_ID);
  const tokenDomain = idTokenPayload.hd;
  const userEmail = idTokenPayload.email;

  // 2. Fetch institution's allowed domains
  const { data: org } = await env.SUPABASE_CLIENT
    .from('organizations')
    .select('allowed_domains, student_auth_mode')
    .eq('institute_code', instituteCode)
    .single();

  if (!org) {
    throw new Error('Unauthorized: Institution code does not exist');
  }

  // 3. Reject personal accounts or non-whitelisted campus domains
  if (!tokenDomain || !org.allowed_domains.includes(tokenDomain)) {
    throw new Error(
      `Access Denied: You must sign in using your official @${org.allowed_domains.join(' or @')} account.`
    );
  }

  return { authorized: true, studentEmail: userEmail };
}
```

By verifying the cryptographically signed `hd` claim on the server before issuing a test session token, **it is physically impossible for a student with an external Gmail account to load an examination**.

---

## 2. Multi-Tenant Provisioning & The "Ghost Handover" Model

One of the largest hurdles in campus EdTech adoption is administrative onboarding friction. IT directors do not want to configure 50 individual faculty accounts, and faculty members do not want to navigate complex administrative dashboards.

To solve this, Colformly pioneered the **Ghost Handover Lifecycle**.

### The Three Phases of Campus Provisioning

```
┌────────────────────────────────────────────────────────┐
│ PHASE 1: SUPER ADMIN SETUP MODE                        │
│  - Central IT creates organization record              │
│  - Configures institute code, domain whitelist, quotas │
│  - Seeds academic departments & class sections         │
│  - Status: 'SETUP_MODE'                                │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ PHASE 2: VERIFICATION & AUDIT                          │
│  - Setup admin tests student gatekeeper with dummy IDs │
│  - Verifies institutional Google Workspace linkage     │
│  - Confirms zero-leakage token encryption              │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼ Handover Action Triggered
┌────────────────────────────────────────────────────────┐
│ PHASE 3: GHOST HANDOVER TO CAMPUS DIRECTOR             │
│  - Target faculty member designated as Primary Admin   │
│  - Status atomically transitions to 'HANDED_OVER'      │
│  - Setup admin permissions permanently revoked         │
│  - Institution operates with 100% data sovereignty    │
└────────────────────────────────────────────────────────┘
```

### Why Ghost Handover Matters
In traditional multi-tenant SaaS, the central system administrator retains persistent root access to every tenant's data. This creates severe compliance and legal liability risks under national data protection frameworks:
- If a central admin account is compromised, every university's student grades and exam questions are exposed.
- Faculty deans resist software where external platform vendors can see their proprietary test banks.

With Colformly’s Ghost Handover:
1. The **Setup Admin** operates only during the bootstrapping phase (`onboarding_status = 'SETUP_MODE'`).
2. Once the organization is handed over (`onboarding_status = 'HANDED_OVER'`), the setup admin's privileges are atomically revoked by Supabase PostgreSQL RLS policies.
3. The university's academic director takes complete ownership. The platform vendor retains zero access to exam content.

---

## 3. Cryptographic Token Vault: AES-256-GCM Token Encryption

When teachers connect their Google Drive to Colformly to enable automated form and spreadsheet synchronization, Colformly receives an OAuth 2.0 refresh token.

Because refresh tokens provide long-lived access to create files inside the teacher's Google Drive, storing them as plain text inside a database table represents an unacceptable security vulnerability.

### The Storage Architecture
Colformly stores all third-party credentials inside an isolated `public.google_credentials` table:

```sql
CREATE TABLE public.google_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  encrypted_refresh_token text NOT NULL,
  iv text NOT NULL,
  tag text NOT NULL,
  scopes text[] NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### AES-256-GCM Authenticated Encryption
Every token is encrypted at rest using AES-256 in Galois/Counter Mode (GCM):
- **Initialization Vector (IV):** A unique, cryptographically random 96-bit IV is generated for every single encryption operation.
- **Authentication Tag:** A 128-bit authentication tag guarantees that the encrypted ciphertext cannot be tampered with or bit-flipped at rest.
- **Master Encryption Key:** The AES-256 master key is held exclusively in Cloudflare Worker secret environment variables (`GCP_TOKEN_ENCRYPTION_KEY`) and is never committed to Git or stored in database tables.

Even if an unauthorized party obtains a full database snapshot, **the tokens cannot be decrypted without the edge master secret**.

---

## 4. The 10-Point Campus Rollout Checklist for University IT Directors

Before deploying digital examination infrastructure across an institution, university IT administrators should audit their architecture against this 10-point checklist:

- [ ] **1. Server-Side Domain Gate:** Is student Google Sign-In verified via signed `hd` claims on the backend rather than in browser JavaScript?
- [ ] **2. Minimal OAuth Scopes:** Does the testing platform request strictly `drive.file` instead of broad, dangerous `drive` or `spreadsheets` scopes?
- [ ] **3. Answer Key Isolation:** Are answer keys completely excluded from the student browser bundle and stored in an access-restricted server ledger?
- [ ] **4. Server-Side Exam Timers:** Are test start and end times calculated by the server using tamper-proof timestamps rather than device clocks?
- [ ] **5. Zero-Limit Ingestion:** Does the system bypass the 60-write-per-minute Google Sheets API limit via split-plane background workers?
- [ ] **6. Sovereign Faculty Ownership:** Do final exam grades and answer spreadsheets reside in the faculty member's institutional Google Drive?
- [ ] **7. Multi-Tenant Role Isolation:** Are student records, test questions, and audit logs isolated using PostgreSQL Row Level Security (RLS)?
- [ ] **8. Zero Spyware / Respectful UI:** Does the student client operate in standard web browsers without requiring kernel-level DRM or invasive webcam feeds?
- [ ] **9. Token Encryption at Rest:** Are all OAuth refresh tokens encrypted using authenticated AES-256-GCM before database insertion?
- [ ] **10. Handover Sovereignty:** Does the platform provide an atomic handover mechanism that locks platform vendors out of academic records once configured?

---

## Conclusion: Peaceful, High-Trust Campus Examinations

The goal of campus examination technology is not to treat students like adversaries or turn lecture halls into high-surveillance police states.

When identity is cryptographically verified at the campus domain gate, when answer keys are securely isolated on edge workers, and when faculty retain 100% ownership of their Google Sheets data, examinations become what they were always meant to be: **calm, fair, and seamless evaluations of student mastery**.

Colformly provides this complete foundation out of the box—free, open, and engineered for the world's most demanding academic institutions.

---

### Ready to Modernize Your Campus Testing?
Explore our live documentation or schedule a technical pilot for your university:
- **Architecture Deep-Dive:** [Why Google Forms Alone Fail College Exams](/blog/why-google-forms-fail-college-exams-server-side-grading)
- **High-Concurrency Scale:** [Zero-Limit Exam Storage via Split-Plane Edge Sync](/blog/zero-limit-exam-storage-split-plane-architecture-google-sheets)
- **Request a Campus Pilot:** [colformly.edgecors.com/#pilot-demo](https://colformly.edgecors.com/#pilot-demo)
