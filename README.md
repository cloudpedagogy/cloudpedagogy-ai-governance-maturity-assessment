# CloudPedagogy AI Governance Maturity Assessment

An institutional self-assessment instrument for evaluating organisational readiness in governing AI-supported systems.

## 🔗 Role in the CloudPedagogy Ecosystem

**Phase:** Phase 2 — Governance Pipeline

**Role:**
Evaluates institutional governance maturity and readiness by diagnosing gaps in strategic, ethical, and operational practice.

**Upstream Inputs:**
Audit outcomes from the **Risk Scanner** and aggregate metadata from the **Human-AI Decision Record**.

**Downstream Outputs:**
Generates strategic Gap-to-Action mapping used for institutional policymaking and executive governance review.

**Does NOT:**
- Perform granular risk audits of individual workflows.
- Record live individual decision outcomes in production.


## Overview

This tool is a key component of the **Human–AI Governance Engineering** suite within the CloudPedagogy ecosystem. Built on **Capability-Driven Development (CDD)** principles, it prioritizes the interpretation of governance maturity over simple numerical scoring.

### Strategic Context
- **Governance-First**: Designed to reveal organisational blind spots and structural fragility.
- **Insight-Driven**: Generates interpreted patterns and fragility signals, not just a score.
- **Strategic Evaluation**: Includes a headline **Governance Readiness Index** and automated **Gap-to-Action** mapping.
- **Trend Tracking**: Compares current assessment against historical snapshots or imported data.
- **Privacy-Preserving**: Runs entirely in the browser; all data stays in `localStorage`.

---

## 🏛️ Strategic Evaluation System

This tool has been strengthened to support institutional-level governance evaluation:

### 1. Governance Readiness Index
A headline metric (0–100%) providing a high-level view of governance maturity across all 7 dimensions. This score is recalculated independently of any design-time metrics to ensure audit integrity.

### 2. Gap-to-Action Mapping
Automated, rule-based recommendations for any dimensions scoring at Maturity Level 0 (Emerging) or 1 (Developing). These actions are designed to move the institution toward systematic governance.

### 3. Artefact Linking
Support for lightweight evidence linking, allowing maturity claims to be tied to specific human–AI workflows or decision records (referenced by ID).

### 4. Trend Tracking & Comparison
Supports side-by-side comparison with historical snapshots:
- **LocalStorage History**: Automatically preserves the last 5 assessment reflections.
- **Side-by-Side Upload**: Import a previous JSON profile to visualize governance progress or drift over time.


---

## 🌐 Live Application (Local-First, Privacy-Preserving)

👉 http://cloudpedagogy-ai-governance-maturity-assessment.s3-website.eu-west-2.amazonaws.com/

This is a fully functional, browser-based application designed for real-world use.

- Runs entirely client-side (no backend)
- All data is stored locally in your browser (localStorage)
- No data is transmitted, stored, or shared externally
- No login or account required

**Note:** Your data will remain on your device unless you export it or clear your browser storage.

---

## 🖼️ Interface Preview

![AI Governance Maturity Assessment Screenshot](docs/screenshot.png)

*Example view of the Governance Profile showing maturity distribution, interpreted patterns, and fragility signals.*

---

## 🛠️ Getting Started

### Clone the repository

```bash
git clone [repository-url]
cd [repository-folder]
```

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm run dev
```

Once running, your terminal will display a local URL (often http://localhost:5173). Open this in your browser to use the application.

### Build for production

```bash
npm run build
```

The production build will be generated in the `dist/` directory and can be deployed to any static hosting service.

---

## 🔐 Privacy & Security

- **Fully local**: All data remains in the user's browser  
- **No backend**: No external API calls or database storage  
- **Privacy-preserving**: No tracking or data exfiltration  
- Suitable for use in sensitive organisational and governance contexts  

---

## Disclaimer

This repository contains exploratory, framework-aligned tools developed for reflection, learning, and discussion.

These tools are provided **as-is** and are not production systems, audits, or compliance instruments. Outputs are indicative only and should be interpreted in context using professional judgement.

All applications are designed to run locally in the browser. No user data is collected, stored, or transmitted.

All example data and structures are synthetic and do not represent any real institution, programme, or curriculum.

---

## Licensing & Scope

This repository contains open-source software released under the MIT License.

CloudPedagogy frameworks and related materials are licensed separately and are not embedded or enforced within this software.

---

## About CloudPedagogy

CloudPedagogy develops open, governance-credible resources for building confident, responsible AI capability across education, research, and public service.

- Framework: https://github.com/cloudpedagogy/cloudpedagogy-ai-capability-framework

## Capability and Governance

This tool supports both AI capability development and lightweight governance.

- **Capability** is developed through structured interaction with real workflows
- **Governance** is supported through optional fields that make assumptions, risks, and decisions visible

All governance inputs are optional and designed to support — not constrain — professional judgement.

