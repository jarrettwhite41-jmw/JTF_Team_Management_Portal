# Security Audit — JTF Portal Ecosystem (Full)

**Audit Date**: 2026-06-29
**Scope**: Team Management Portal, Instructor Portal, Cast Portal, Directors Portal
**Risk Summary**: [5] Critical · [7] High · [4] Medium · [3] Low

---

## Executive Summary

The JTF portal ecosystem exhibits **severe authorization and data exposure vulnerabilities** at both the database and application layers. The most critical issue is the **absence of Row-Level Security (RLS) on core data tables**, which permits any authenticated user to bypass role-based access controls and access sensitive personnel information (PII including birthdays, emails, and phone numbers). Combined with weak authentication policies and client-side-only access control enforcement, the system poses significant risk to data confidentiality and integrity.

**Blocking issues for production**: All five critical findings must be resolved before any portal handles real user data.

---

## Key Findings Summary

| ID | Issue | Severity | Category | Impact |
|---|---|---|---|---|
| **FINDING-01** | No RLS on core data tables | 🔴 Critical | A01: Broken Access Control | Any authenticated user can query all personnel, student, show data |
| **FINDING-02** | Sensitive PII exposed in queries | 🔴 Critical | A01 + A04 | Birthdates, phones, emails accessible to lower-privileged roles |
| **FINDING-03** | Client-side access control primary | 🔴 Critical | A01 + A05 | Attackers can bypass role checks via DevTools |
| **FINDING-04** | Weak password policy (8 chars min only) | 🔴 High | A02 + A07 | Trivial brute-force attacks |
| **FINDING-05** | Password reset user enumeration | 🔴 High | A01 + A07 | Attackers can build targeted email lists |
| **FINDING-06** | Multi-portal password reset redirect confusion | 🔴 High | A01 + A03 | Wrong portal redirects possible |
| **FINDING-07** | No rate limiting on auth endpoints | 🔴 High | A07 + A04 | Brute-force, credential stuffing, spam |
| **FINDING-08** | No Content Security Policy headers | 🔴 High | A03 + A05 | XSS/injection attacks, CDN poisoning |
| **FINDING-09** | Env vars baked into JS bundle | 🔴 High | A02 + A05 | Supabase anon key exposed, permanent compromise |
| **FINDING-10** | Potential RLS recursion in admin RPC | 🟠 Medium | A01 | System stability / DoS risk |
| **FINDING-11** | No HSTS headers or HTTPS enforcement | 🟠 Medium | A02 | MITM downgrade attacks |
| **FINDING-12** | Missing email format validation | 🟠 Medium | A03 | Unexpected behavior, injection risk |

---

## Critical Findings Detail

### **[FINDING-01]: No Row-Level Security on Core Data Tables**

**Severity**: Critical | **OWASP**: A01: Broken Access Control

**Problem:**
Core tables (`personnel`, `show_information`, `student_enrollments`, `class_offerings`, `student_info`, etc.) have **zero RLS policies**. Any authenticated user can execute unrestricted queries and retrieve all personnel data, including:
- Birthdays (DOB)
- Email addresses
- Phone numbers
- Instagram handles

**Risk:**
- Student can read all teacher emails + phone numbers
- Cast member can read director/producer contact info
- Attacker with any valid credentials extracts full personnel directory

**Fix Priority**: 🔴 BLOCKING — Must fix before production

**Recommended RLS Policies:**
- `personnel`: Return records only if user has `admin` role OR records are explicitly assigned to their role context
- `show_information`: Directors see owned shows; cast see shows they're eligible for; admin see all
- `student_enrollments`: Students see own enrollments; teachers see their students; admin see all
- `class_offerings`: Teachers see their classes; admin see all

---

### **[FINDING-03]: Client-Side Access Control is Primary Defense**

**Severity**: Critical | **OWASP**: A01: Broken Access Control

**Problem:**
Page access is gated only by the `canAccessPage()` function in React state. No server-side authorization checks. Attackers can:
1. Modify browser state to set `currentPage = 'personnel-management'`
2. Call Supabase client directly bypassing the React app
3. Craft API calls to restricted endpoints

**Risk:**
- Complete bypass of role-based page access
- Direct database access via Supabase client (combined with FINDING-01)

**Fix Priority**: 🔴 BLOCKING

**Recommended Fixes:**
1. Implement RLS on **all tables** (FINDING-01)
2. Add backend authorization checks (RPC functions or middleware)
3. Verify role at database level for every query
4. Use `current_user` in Postgres to prevent token manipulation

---

### **[FINDING-04]: Weak Password Policy**

**Severity**: High | **OWASP**: A02 + A07

**Problem:**
Passwords require only 8 characters. No complexity requirements. Acceptable: `password`, `12345678`, `aaaaaaaa`

**Risk:**
Brute-force attacks succeed in hours to days. Dictionary attacks trivial.

**Fix Priority**: 🔴 BLOCKING

**Recommended Fixes:**
- Require minimum 12 characters
- Require: uppercase + lowercase + digit + special character
- Implement password history (no reuse of last 5)
- Add password expiration (90 days)

---

### **[FINDING-07]: No Rate Limiting**

**Severity**: High | **OWASP**: A07 + A04

**Problem:**
Sign-in, password reset, password update endpoints have no rate limiting. Unlimited brute-force attempts.

**Risk:**
Credential stuffing, account lockout attacks, spam.

**Fix Priority**: 🔴 BLOCKING

**Recommended Fixes:**
- Limit sign-in to 5 attempts per IP per 15 minutes
- Limit password reset to 3 per email per hour
- Add exponential backoff (progressive delays)
- Add CAPTCHA after 3 failed attempts

---

### **[FINDING-08]: No Content Security Policy**

**Severity**: High | **OWASP**: A03 + A05

**Problem:**
No CSP headers. Tailwind CSS loaded from unpinned CDN (`cdn.tailwindcss.com`). Attacker can:
1. Poison CDN or DNS hijack
2. Inject malicious JavaScript
3. Steal session tokens

**Risk:**
Session token theft, credential harvesting, malware injection.

**Fix Priority**: 🔴 BLOCKING

**Recommended Fixes:**
- Add strict CSP header to `vercel.json`
- Host Tailwind locally (npm build) instead of CDN
- Pin all external resource URLs and add SRI hashes

---

### **[FINDING-09]: Environment Variables in Bundle**

**Severity**: High | **OWASP**: A02 + A05

**Problem:**
Supabase anon key is embedded in compiled JS at build time via Vite's `define`. Attacker can:
1. Download production JS from browser
2. Extract the key
3. Use key to query database directly

**Risk:**
Permanent compromise of Supabase anon key. Attacker has database access (combined with FINDING-01).

**Fix Priority**: 🔴 BLOCKING

**Recommended Fixes:**
- Remove `define` option from `vite.config.ts`
- Let Vite handle `VITE_*` variables automatically
- Do NOT embed secrets in client code

---

## High-Priority Fixes

| Finding | Fix Effort | Owner | Deadline |
|---|---|---|---|
| FINDING-01: RLS on core tables | 3-4 days | DBA | Week 1 |
| FINDING-03: Client-side auth | 1-2 days | Backend | Week 1 |
| FINDING-04: Weak password policy | 1 day | Backend | Week 1 |
| FINDING-07: Rate limiting | 2-3 days | Backend/DevOps | Week 1 |
| FINDING-08: CSP headers | 1 day | Frontend | Week 1 |
| FINDING-09: Env vars in bundle | 1 day | Frontend | Week 1 |

---

## Verdict

**Status: DO NOT DEPLOY TO PRODUCTION**

All 5 critical findings must be resolved before production use. System is suitable for **internal testing only** with non-sensitive data.

**Post-Fix Re-Audit Required**: After implementing all critical fixes, re-run security audit before UAT.

---

*Audit Completed: 2026-06-29  
Auditor: Security Auditor (Agent)  
Next Review: After critical fixes implemented*
