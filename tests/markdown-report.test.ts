import { describe, it, expect } from 'vitest';
import { exportToMarkdown, calculateGovernanceProfile } from '../src/logic/assessment';
import schemaData from '../MATURITY_SCHEMA.json';
import type { Schema, AssessmentRecord } from '../src/types';

describe('B2.5: Markdown Report Export Completeness and Safety', () => {
    const schema = schemaData as Schema;

    it('generates a faithful, comprehensive assessment record across all seven dimensions', () => {
        const record: AssessmentRecord = {
            assessment_id: 'md-test-01',
            organisation_name: 'St. Jude Healthcare Trust',
            date_created: '2026-10-28',
            team_mode: true,
            scores: {
                traceability: 3,
                boundary_clarity: 2,
                risk_management: 3,
                accountability: 1,
                policy_alignment: 1,
                review_practices: 2,
                learning_capability: 1
            },
            notes: {
                traceability: 'Comprehensive automated logging via ModelRegistry.',
                risk_management: 'Periodic clinical failure audits performed.'
            },
            artefacts: [
                {
                    id: 'art-01',
                    type: 'workflow',
                    ref: 'WF-CLIN-01',
                    name: 'Diagnostic Escalation Workflow',
                    dimensionId: 'boundary_clarity'
                },
                {
                    id: 'art-02',
                    type: 'document',
                    ref: 'POL-AI-SEC',
                    name: 'AI Security Standard',
                    dimensionId: 'policy_alignment'
                },
                {
                    id: 'art-03',
                    type: 'decision',
                    ref: 'DEC-LEGACY-01',
                    name: 'Legacy Oversight Record'
                    // unlinked
                }
            ],
            capabilityNotes: 'Clinical staff training initiated.',
            governanceNotes: 'Executive board charter signed.'
        };

        const profile = calculateGovernanceProfile(schema, record);
        const md = exportToMarkdown(record, profile, schema);

        // 1. Header & Context
        expect(md).toContain('# AI Governance Profile: St. Jude Healthcare Trust');
        expect(md).toContain('Date: 2026-10-28');
        expect(md).toContain('Mode: Team Discussion');

        // 2. Self-Assessment Notice & Disclaimer
        expect(md).toContain('Self-Assessment Notice & Disclaimer');
        expect(md).toContain('not as external regulatory compliance certification');

        // 3. Summary metrics
        expect(md).toContain('**Governance Readiness Index**: 62%');
        expect(md).toContain('**Overall State**: Established Maturity');

        // 4. Seven-Dimension Breakdown Table
        expect(md).toContain('| Dimension | Score | Maturity Level | Qualitative Notes | Linked Evidence |');
        expect(md).toContain('| Decision Traceability | 3/3 | Comprehensive (3) | Comprehensive automated logging via ModelRegistry. | None |');
        expect(md).toContain('| Human–AI Boundary Clarity | 2/3 | Systematic (2) | None recorded | WF-CLIN-01 (Diagnostic Escalation Workflow) |');
        expect(md).toContain('| Risk Awareness & Management | 3/3 | Comprehensive (3) | Periodic clinical failure audits performed. | None |');
        expect(md).toContain('| Oversight & Accountability | 1/3 | Documented (1) | None recorded | None |');
        expect(md).toContain('| Policy & Governance Alignment | 1/3 | Documented (1) | None recorded | POL-AI-SEC (AI Security Standard) |');
        expect(md).toContain('| Review & Reflection Practices | 2/3 | Systematic (2) | None recorded | None |');
        expect(md).toContain('| Institutional Learning & Renewal | 1/3 | Documented (1) | None recorded | None |');

        // 5. Gap-to-Action recommendations
        expect(md).toContain('## Strategic Recommended Actions (Gap-to-Action)');
        expect(md).toContain('Review and update institutional contracts and employment standards');

        // 6. Strategic Improvement directions
        expect(md).toContain('## Directions for Strategic Improvement');
        expect(md).toContain('Clarifying accountability roles');

        // 7. Reflection prompts
        expect(md).toContain('## Key Reflection Prompts (Team Discussion Mode)');
        expect(md).toContain('Where is our team relying on individual heroics rather than governance systems?');

        // 8. Patterns and fragility signals
        expect(md).toContain('## Interpreted Patterns');
        expect(md).toContain('Strong Applied Practice, Weak Oversight');
        expect(md).toContain('## Governance Fragility Signals');
        expect(md).toContain('Accountability roles are unclear or distributed too thinly.');

        // 9. Evidence & Artefacts Portfolio
        expect(md).toContain('## Evidence & Artefacts Portfolio');
        expect(md).toContain('### Linked Evidence by Dimension');
        expect(md).toContain('**Human–AI Boundary Clarity**:');
        expect(md).toContain('[workflow] WF-CLIN-01 — Diagnostic Escalation Workflow');
        expect(md).toContain('### General / Institutional Evidence (Legacy or Unlinked)');
        expect(md).toContain('[decision] DEC-LEGACY-01 — Legacy Oversight Record');

        // 10. Capability & Governance Notes
        expect(md).toContain('Clinical staff training initiated.');
        expect(md).toContain('Executive board charter signed.');
    });

    it('safely escapes special Markdown characters in user-controlled inputs to maintain table structure', () => {
        const record: AssessmentRecord = {
            assessment_id: 'escape-test',
            organisation_name: 'Corp | Risk & Tech <script>',
            date_created: '2026-10-28',
            team_mode: false,
            scores: { traceability: 2 },
            notes: {
                traceability: 'Note with pipe | and newline \n inside text'
            },
            artefacts: [
                {
                    type: 'document',
                    ref: 'REF | PIPE',
                    name: 'Name | With Pipe\nSecond line',
                    dimensionId: 'traceability'
                }
            ]
        };

        const profile = calculateGovernanceProfile(schema, record);
        const md = exportToMarkdown(record, profile, schema);

        // Find table row for traceability
        const lines = md.split('\n');
        const traceLine = lines.find(l => l.startsWith('|') && l.includes('Decision Traceability'));
        expect(traceLine).toBeDefined();

        // The row should start and end with pipe, and have escaped internal pipes
        expect(traceLine?.startsWith('|')).toBe(true);
        expect(traceLine?.endsWith('|')).toBe(true);
        // Should not have literal unescaped newlines in table line
        expect(traceLine).toContain('Note with pipe \\| and newline   inside text');
        expect(traceLine).toContain('REF \\| PIPE (Name \\| With Pipe Second line)');
    });

    it('faithfully represents unscored dimensions as Unscored / Not Assessed without fabricating zero scores', () => {
        const partialRecord: AssessmentRecord = {
            assessment_id: 'partial-01',
            organisation_name: 'Partial Org',
            date_created: '2026-10-28',
            team_mode: false,
            scores: { traceability: 2 }, // only 1 dimension scored
            notes: {},
            artefacts: []
        };

        const profile = calculateGovernanceProfile(schema, partialRecord);
        const md = exportToMarkdown(partialRecord, profile, schema);

        // Unscored dimensions should show Unscored and Not Assessed
        expect(md).toContain('| Human–AI Boundary Clarity | Unscored | Not Assessed | None recorded | None |');
        expect(md).toContain('| Risk Awareness & Management | Unscored | Not Assessed | None recorded | None |');
    });
});
