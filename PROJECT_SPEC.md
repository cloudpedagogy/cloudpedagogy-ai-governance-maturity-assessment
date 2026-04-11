# PROJECT_SPEC: cloudpedagogy-ai-governance-maturity-assessment

## 1. Repo Name
`cloudpedagogy-ai-governance-maturity-assessment`

## 2. One-Sentence Purpose
A deep-dive diagnostic tool for auditing and scoring 7 architectural dimensions of institutional AI governance.

## 3. Problem the App Solves
The reluctance to adopt AI due to a lack of clear governance benchmarks; identifies "Fragility Signals" and provides explicit "Improvement Directions" for institutional leadership.

## 4. Primary User / Audience
Chief Information Officers (CIOs), Governance committees, Audit and Compliance offices.

## 5. Core Role in the CloudPedagogy Ecosystem
The "Architectural Layer"; focuses on system-level governance (Strategy, Risk, Policy, Oversight) rather than individual/curriculum capability (Awareness, Practice).

## 6. Main Entities / Data Structures
- **AssessmentRecord**: The primary dataset capturing organisation info, dates, scores per dimension, and qualitative notes.
- **Schema**: Defines the 7 dimensions, reflective prompts, and maturity level definitions.
- **GovernanceProfile**: Computed output including overall maturity, fragility signals, strong/weak areas, and recommended improvement directions.

## 7. Main User Workflows
1. **Audit Initiation**: Set institutional context (Individual vs Team mode).
2. **Dimension Scoring**: Evaluate 7 governance dimensions (Strategy, Oversight, etc.) using reflective prompts.
3. **Pattern Analysis**: Review computed "Maturity Patterns" and fragility signals.
4. **Strategic Reporting**: Export results (Markdown/JSON) to inform governance committees.

## 8. Current Features
- Vanilla JS/TS calculation engine.
- 7-dimension maturity model.
- Dynamic generation of "Improvement Directions" based on scoring patterns.
- Robust Markdown and JSON exports.
- Local persistence of the latest session.

## 9. Stubbed / Partial / Incomplete Features
- "Patterns" library is stable but listed as extensible within the architectural notes.

## 10. Import / Export and Storage Model
- **Storage**: Persistent local storage (`ai_gov_assessment`).
- **Export**: Full JSON project data and human-readable Markdown reports.

## 11. Relationship to Other CloudPedagogy Apps
Sits at the highest level of abstraction; assesses the institutional environment in which all other CloudPedagogy curriculum tools are deployed.

## 12. Potential Overlap or Duplication Risks
Minimal; focuses on *Governance Architecture* which is significantly more detailed than the "Governance" domain in capability tools.

## 13. Distinctive Value of This App
Identifies "Fragility Signals"—specific patterns of weakness that indicate severe institutional risk—and provides actionable "Improvement Directions."

## 14. Recommended Future Enhancements
(Inferred) Sector benchmarking against anonymized institutional averages; automated drafting of governance policies matching maturity gaps.

## 15. Anything Unclear or Inferred from Repo Contents
The 7 dimensions are hardcoded in the prototype but designed for future schema-driven extensibility.
