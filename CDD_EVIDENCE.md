# CDD Evidence: AI Governance Maturity Assessment

## Capability: Governance Readiness Assessment
- **Evidence**: The application uses a structured 7-dimension framework to evaluate organisational readiness.
- **Reference**: `MATURITY_SCHEMA.json`

## Capability: Gap Identification
- **Evidence**: The system automatically detects imbalances and missing governance structures based on dimension scores.
- **Reference**: `src/logic/assessment.ts` -> `calculateMaturity` function (gaps and improvementAreas).

## Capability: Pattern & Fragility Interpretation
- **Evidence**: Identified patterns like "Strong Practice but Weak Oversight" and fragility signals related to institutional memory.
- **Reference**: `src/logic/assessment.ts` -> `calculateMaturity` (patterns and fragilitySignals).

## Capability: Reflective Oversight
- **Evidence**: Every assessment dimension includes specific reflective prompts designed to challenge the user's assumptions.
- **Reference**: `MATURITY_SCHEMA.json` -> `reflective_prompts`

## Capability: Institutional Portability
- **Evidence**: Results are exportable in structured formats suitable for board-level reporting.
- **Reference**: Export logic in `src/logic/export.ts` (to be implemented).
