# CloudPedagogy AI Governance Maturity Assessment

An institutional self-assessment instrument for evaluating organisational readiness in governing AI-supported systems.

## Overview

This tool is a key component of the **Human–AI Governance Engineering** suite within the CloudPedagogy ecosystem. Built on **Capability-Driven Development (CDD)** principles, it prioritizes the interpretation of governance maturity over simple numerical scoring.

### Strategic Context
- **Governance-First**: Designed to reveal organisational blind spots and structural fragility.
- **Insight-Driven**: Generates interpreted patterns and fragility signals, not just a score.
- **Privacy-Preserving**: Runs entirely in the browser; all data stays in `localStorage`.

---

## 🌐 Live Hosted Version

👉 http://cloudpedagogy-ai-governance-maturity-assessment.s3-website.eu-west-2.amazonaws.com/

This is a fully functional, browser-based application designed for real-world use.

- Runs entirely client-side (no backend)
- All data is stored locally in your browser (localStorage)
- No data is transmitted, stored, or shared externally
- No login or account required

**Note:** Your data will remain on your device unless you export it or clear your browser storage.

---

## 🖼️ Screenshot

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

---

## Licensing & Scope

This repository contains open-source software released under the MIT License.

CloudPedagogy frameworks and related materials are licensed separately and are not embedded or enforced within this software.

---

## About CloudPedagogy

CloudPedagogy develops open, governance-credible resources for building confident, responsible AI capability across education, research, and public service.

- Website: https://www.cloudpedagogy.com/
- Framework: https://github.com/cloudpedagogy/cloudpedagogy-ai-capability-framework
