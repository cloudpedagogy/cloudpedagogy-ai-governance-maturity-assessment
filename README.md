# CloudPedagogy AI Governance Maturity Assessment

An independent, local-first open-source self-assessment instrument for evaluating organisational readiness in governing AI-supported systems.

Part of the **CloudPedagogy AI Management Studio** open-source toolkit.

---

## 🔗 Role in the CloudPedagogy Ecosystem

**Phase:** Phase 2 — Governance Pipeline

**Role:**
Evaluates institutional governance maturity and readiness by diagnosing gaps across strategic, ethical, and operational practices.

**Upstream Inputs:**
Audit outcomes from the **Risk Scanner** and aggregate metadata from the **Human-AI Decision Record**.

**Downstream Outputs:**
Generates strategic Gap-to-Action mapping, dimensional audit records, and governance profiles used for institutional policymaking and executive governance review.

**Scope Boundaries (Does NOT):**
- Does not perform automated static code or runtime risk audits of individual models.
- Does not record live individual decision outcomes in production.
- Does not replace external statutory audits, regulatory certifications, or legal compliance verification.

---

## Overview

Built on **Capability-Driven Development (CDD)** principles, this tool prioritises qualitative governance reflection and structural maturity diagnosis over simplistic numerical scoring.

### Key Capabilities
- **Local-First & Privacy-Preserving**: Runs 100% in the browser. Zero telemetry, zero external APIs, zero backend dependencies. All data resides in browser `localStorage`.
- **Interactive 7-Dimension Stepper**: Fluid navigation between all 7 governance dimensions with automatic draft saving and progress indication (completed vs incomplete).
- **Comprehensive Results Breakdown**: Full audit table inspecting every dimension score, descriptive maturity level, qualitative reflection notes, and linked evidence references, with one-click direct "Revisit" jumping.
- **Evidence Management**: Link, edit, and curate evidence references (workflows, decision records, policy documents) supporting maturity claims.
- **Import, Restore & History Snapshots**: Robust JSON import validation, 5-slot historical circular buffer with side-by-side trend comparisons and restoration safeguards.
- **Executive Reporting & Print-to-PDF**: Standardised Markdown report export and high-contrast `@media print` layout optimised for browser print-to-PDF generation.

---

## 🏛️ Governance Methodology & Maturity Scale

The assessment evaluates organisations across **seven core dimensions** on a **0 to 3 maturity scale**:

### Four-Level Maturity Scale (0–3)
- **Level 0 — Emerging (0 points)**: Governance is ad-hoc, informal, and reactive. No structured documentation or systematic oversight.
- **Level 1 — Developing (1 point)**: Basic structures exist but are inconsistent, siloed, or dependent on individual competence rather than formalised systems.
- **Level 2 — Established (2 points)**: Formally defined processes, explicit roles, tailored policies, and regular review cadences are in place.
- **Level 3 — Advanced (3 points)**: Governance is deeply integrated into operational lifecycles, proactive, dynamic, and continuously learning from incidents.

### Seven Governance Dimensions
1. **Decision Traceability (`traceability`)**: The ability to reconstruct how and why AI-supported decisions were reached, documenting human overrides and provenance.
2. **Human–AI Boundary Clarity (`boundary_clarity`)**: Clarity on where AI autonomy ends and human accountability begins, including explicit override triggers.
3. **Risk Awareness & Management (`risk_management`)**: Systematic identification, classification, and mitigation of AI-specific operational and ethical failure modes.
4. **Oversight & Accountability (`accountability`)**: Institutional structures, designated roles, and executive escalation paths for AI systems.
5. **Policy & Governance Alignment (`policy_alignment`)**: Integration of AI practices with organisational values, ethical frameworks, and statutory standards.
6. **Review & Reflection Practices (`review_practices`)**: Periodic evaluation cycles, post-deployment audits, and critical reflection on AI tool necessity.
7. **Institutional Learning & Renewal (`learning_capability`)**: The habit of capturing post-incident debriefs and translating operational insights into updated guardrails.

---

## 📊 Interpretation of Scores & Insights

### Governance Readiness Index (0–100%)
An equally weighted index across the 7 dimensions (`(sum of scores / 21) * 100`).
> **Integrity Notice**: In partial assessments, unanswered dimensions are factored into the readiness index at Level 0 (Unmanaged) rather than omitted. This ensures the index never conceals incomplete assessments or provides false confidence.

### Gap-to-Action Remediation
Rule-based tactical recommendations automatically generated for dimensions scoring at Level 0 or Level 1. Actions provide immediate, concrete steps to establish baseline governance.

### Strategic Improvement Pathways
Derived pathways offering differentiated guidance:
- Remedial priorities for dimensions at Level 0 or 1.
- Strengthening guidance for dimensions established at Level 2.
- Resilience stress-testing and sector knowledge-sharing for Level 3 practices.

### Heuristic Fragility Signals & Divergent Patterns
Identifies structural imbalances between dimensions (e.g., *High Reliance, Low Reflection* or *Strong Applied Practice, Weak Oversight*). These signals represent potential organizational risks, not certified failure states.

---

## 💾 Local Storage, Import, Export & History

### Local Storage Buffer
All assessment states are automatically saved to `localStorage` under `cp_aigov_assessment_v1`.
When starting a new assessment, the active record is preserved in a circular history buffer (`cp_aigov_history_v1`) holding up to 5 snapshots.

### Assessment Import & Active Work Protection
- **Safe Validation**: Imported JSON files are validated against the schema before loading.
- **Protection of Active Work**: If the user has active unsaved work, a confirmation dialog appears before replacing data, and the existing assessment is automatically archived to the history buffer.
- **Intelligent Navigation**: Fully scored imports navigate directly to the Results dashboard; partial imports navigate to the first incomplete dimension.

### History Snapshots & Trend Comparison
- **History Modal**: Review past snapshots, inspect readiness ratings, restore any snapshot as the active assessment, or remove obsolete records.
- **Trend Comparison**: Compare the active assessment against any previous snapshot or uploaded external JSON, visualizing dimensional deltas and overall trajectory.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm (v9 or higher)

### Installation
```bash
# Clone the repository
git clone https://github.com/cloudpedagogy/cloudpedagogy-ai-governance-maturity-assessment.git
cd cloudpedagogy-ai-governance-maturity-assessment

# Install dependencies
npm install
```

### Development Server
```bash
npm run dev
```
Starts the Vite development server (typically at `http://localhost:5173`).

### Automated Testing
```bash
# Run unit and workflow integration tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Production Build
```bash
npm run build
```
Generates a static production bundle in `dist/` with relative asset links (`./assets/...`).

---

## 🚀 Standalone Deployment & Studio Embedding

- **Zero-Backend Static Deployment**: Deploy `dist/` to any static file hosting service:
  - AWS S3 / CloudFront
  - Cloudflare Pages
  - GitHub Pages
  - Netlify / Vercel
- **Studio Embedding**: Because all asset paths are relative (`./`), the built application can be embedded seamlessly within an `<iframe>` inside the CloudPedagogy AI Management Studio or delivered as a standalone offline tool.

---

## ⚠️ Methodological Disclaimers & Known Limitations

- **Self-Assessment Instrument**: This tool reflects internal self-reported practices and subjective reflection. It is an analytical diagnostic instrument for organizational learning and capability development.
- **Not Statutory Compliance**: Scoring does not guarantee compliance with the EU AI Act, ISO/IEC 42001, NIST AI RMF, or other regulatory frameworks.
- **No Remote Telemetry**: Data is confined entirely to the browser environment. Clearing browser storage will delete unsaved snapshots unless exported to JSON or Markdown.

---

## 📄 Licence & Scope

This project is open-source software released under the **MIT License**.
See [LICENSE](LICENSE) for details.
