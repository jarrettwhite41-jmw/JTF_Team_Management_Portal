# V1 Agent Squad — Workflow & File Structure

## 8 Agents in Your Arsenal

| Agent | Saves To | Purpose |
|---|---|---|
| **V1 Release Manager** | `.github/reports/v1-release-manager-[portal].md` | Portal completion scorecard + blockers + recommended sequence |
| **Portal Readiness Checker** | `.github/reports/portal-readiness-[portal].md` | Detailed row-by-row workflow audit against parity contracts |
| **Database & Auth Architect** | `.github/reports/database-auth-audit-[scope].md` | Schema, RLS, index, migration review |
| **Security Auditor** | `.github/reports/security-audit-[scope].md` | OWASP/RLS vulnerabilities, risk prioritization |
| **Test Strategist** | `.github/reports/test-plan-[portal-workflow].md` | Unit/integration/E2E test cases per role, edge cases |
| **JTF UX Researcher** | `.github/reports/ux-research-[portal-feature].md` | UI/accessibility audit, design recommendations |
| **Post-V1 Product Strategist** | `.github/reports/product-strategy-[area].md` | Strategic upgrades beyond V1 (notifications, messaging, etc.) |
| **Implementation Engineer** | Code files directly | Writes code, migrations, components, tests based on findings |

---

## Typical V1 Sprint Workflow

### Day 1-2: ASSESS
```
1. V1 Release Manager
   Prompt: "Give me a V1 scorecard for all portals"
   Output: v1-release-manager-team-portal.md
           v1-release-manager-instructor-portal.md
           v1-release-manager-director-portal.md
           v1-release-manager-cast-portal.md

2. Portal Readiness Checker  
   Prompt: "Audit the Instructor portal against its parity contract"
   Output: portal-readiness-instructor-portal.md
```

### Day 3: HARDEN
```
3. Database & Auth Architect
   Prompt: "Run a full database audit"
   Output: database-auth-audit-full.md

4. Security Auditor
   Prompt: "Full security audit for Team and Instructor portals"
   Output: security-audit-team-instructor.md

5. Test Strategist
   Prompt: "Write V1 test plan for Instructor portal"
   Output: test-plan-instructor-portal.md
```

### Day 4: IMPLEMENT
```
6. Implementation Engineer (read: security-audit-team-instructor.md)
   Prompt: "Implement the RLS policies and validation fixes from the security audit"
   Output: [Modified migration files, updated service code, new components]

7. Implementation Engineer (read: test-plan-instructor-portal.md)
   Prompt: "Write the Jest tests for Instructor portal from this test plan"
   Output: [New .test.ts files, test setup]
```

### Day 5: POLISH
```
8. JTF UX Researcher
   Prompt: "Audit mobile UX for the Cast portal availability form"
   Output: ux-research-cast-availability-form.md

9. Implementation Engineer (read: ux-research-cast-availability-form.md)
   Prompt: "Implement the accessibility and mobile UX improvements"
   Output: [Updated components, improved styling]
```

### Day 6: RE-ASSESS & PLAN POST-V1
```
10. V1 Release Manager
    Prompt: "Re-check Director portal readiness after [X] fixes"
    Output: v1-release-manager-director-portal-v2.md

11. Post-V1 Product Strategist
    Prompt: "What strategic upgrades should we plan for Phase 2?"
    Output: product-strategy-notifications.md
            product-strategy-cast-portal-enhancements.md
```

---

## How Reports Feed Each Other

```
┌─────────────────────────────────────────────────────────────┐
│ V1 Release Manager                                          │
│ Output: v1-release-manager-all.md                           │
│ "Director Portal: 8% done. Blockers: scaffold needed, ..."  │
└──────────────────────┬──────────────────────────────────────┘
                       │ (use this list to plan next steps)
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ Security Auditor                                            │
│ Input: V1 scorecard (context) + code review               │
│ Output: security-audit-team.md                             │
│ "Critical: Shows.tsx calls gasService, may expose secrets" │
└──────────────────────┬──────────────────────────────────────┘
                       │ (implementation reads this)
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ Implementation Engineer                                     │
│ Input: security-audit-team.md                              │
│ Output: [updated Shows.tsx, new migrations]                │
│ "Migrated Shows.tsx to supabaseService, added RLS policy"  │
└──────────────────────┬──────────────────────────────────────┘
                       │ (re-audit)
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ V1 Release Manager (re-run)                                │
│ Input: Updated codebase                                    │
│ Output: v1-release-manager-team-v2.md                      │
│ "Team Portal: 82% done. Shows migration complete. ..."     │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Reference: When to Use Which Agent

**"I want to know where we stand"** → V1 Release Manager
**"I need to verify this portal against its contract"** → Portal Readiness Checker
**"Our schema is a mess"** → Database & Auth Architect
**"What security risks do we have?"** → Security Auditor
**"How do we test this?"** → Test Strategist
**"This UI is confusing"** → JTF UX Researcher
**"What should we build after V1?"** → Post-V1 Product Strategist
**"I have a plan — write the code"** → Implementation Engineer

---

## File Structure

```
.github/
├── agents/
│   ├── v1-release-manager.agent.md
│   ├── portal-readiness-checker.agent.md
│   ├── database-auth-architect.agent.md
│   ├── security-auditor.agent.md
│   ├── test-strategist.agent.md
│   ├── ux-researcher.agent.md
│   ├── post-v1-product-strategist.agent.md
│   └── implementation-engineer.agent.md
└── reports/
    ├── v1-release-manager-team-portal.md
    ├── v1-release-manager-instructor-portal.md
    ├── v1-release-manager-director-portal.md
    ├── v1-release-manager-cast-portal.md
    ├── portal-readiness-instructor-portal.md
    ├── database-auth-audit-full.md
    ├── security-audit-team-instructor.md
    ├── test-plan-instructor-portal.md
    ├── ux-research-cast-availability-form.md
    ├── product-strategy-notifications.md
    └── [more reports as generated]
```

---

## Tips

1. **Save agent outputs as you go** — Copy the agent's full response into `.github/reports/[filename]` so you have an audit trail and other agents can read them.
2. **Use descriptive prompts** — The more context you give (portal name, specific feature, constraints), the better the findings.
3. **Cross-reference findings** — If Security Auditor flags an RLS issue, Portal Readiness Checker should double-check it in the checklist.
4. **Implement incrementally** — Don't wait for all findings before starting. Close easy gaps while deeper audits are running.
5. **Re-run after changes** — After Implementation Engineer ships code, re-run V1 Release Manager to track progress.

---

## Example Session

**You:** (select V1 Release Manager)
> "Give me a V1 scorecard for all portals"

**Agent outputs:**
- Team Portal: 75% — Shows and Workshops need GAS migration
- Instructor Portal: 88% — Workshops view missing
- Director Portal: 8% — Entire app missing
- Cast Portal: 5% — Entire app missing

**You:** Copy that to `.github/reports/v1-release-manager-all.md`

**You:** (select Implementation Engineer)
> "Here are the top 3 gaps from the scorecard. Implement Shows.tsx migration to Supabase. Here's the existing service pattern to follow..."

**Agent outputs:**
- New code for Shows page using supabaseService
- Modified supabaseService with show query methods
- Updated types

**You:** Commit the code

**You:** (select V1 Release Manager again)
> "Re-check Team Portal readiness after Shows.tsx migration"

**Agent outputs:**
- Team Portal: 82% — Workshops next priority

---

That's the workflow. The agents are designed to **specialize once, report to a common format, and feed each other** so you can orchestrate a complete V1 assessment + implementation + quality cycle without context switching.
