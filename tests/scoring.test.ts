import { describe, it, expect } from 'vitest';
import { calculateGovernanceProfile, exportToJSON, exportToMarkdown } from '../src/logic/assessment';
import schemaData from '../MATURITY_SCHEMA.json';
import type { Schema, AssessmentRecord } from '../src/types';

describe('Scoring and Profile Calculation Baseline Integrity', () => {
    const schema = schemaData as Schema;

    const baselineRecord: AssessmentRecord = {
        assessment_id: 'test-rec-1',
        organisation_name: 'St. Jude Healthcare Trust',
        date_created: '2026-04-15',
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
            traceability: 'Full audit logs maintained.'
        },
        artefacts: [
            { type: 'workflow', ref: 'WF-HEALTH-001', name: 'Diagnostic Triage' }
        ],
        capabilityNotes: 'Clinical capability notes',
        governanceNotes: 'Oversight governance notes'
    };

    it('calculates the exact readiness index and overall maturity level', () => {
        const profile = calculateGovernanceProfile(schema, baselineRecord);

        // Sum of scores: 3 + 2 + 3 + 1 + 1 + 2 + 1 = 13.
        // Max possible: 7 * 3 = 21.
        // Index: Math.round((13 / 21) * 100) = Math.round(61.904) = 62%.
        expect(profile.readinessIndex).toBe(62);

        // Average: 13 / 7 = 1.857 (>= 1.5 and < 2.5) -> Established Maturity
        expect(profile.overallMaturity).toBe('Established Maturity');
    });

    it('categorizes dimensions accurately into Strong, Developing, and Weak', () => {
        const profile = calculateGovernanceProfile(schema, baselineRecord);

        // Strong (score >= 3): Decision Traceability, Risk Awareness & Management
        expect(profile.strong).toContain('Decision Traceability');
        expect(profile.strong).toContain('Risk Awareness & Management');

        // Developing (score 1 or 2): Human–AI Boundary Clarity, Oversight & Accountability, Policy & Governance Alignment, Review & Reflection Practices, Institutional Learning & Renewal
        expect(profile.developing).toContain('Human–AI Boundary Clarity');
        expect(profile.developing).toContain('Oversight & Accountability');
        expect(profile.developing).toContain('Policy & Governance Alignment');
        expect(profile.developing).toContain('Review & Reflection Practices');
        expect(profile.developing).toContain('Institutional Learning & Renewal');

        // Weak (score 0): None in baselineRecord
        expect(profile.weak).toHaveLength(0);
    });

    it('identifies fragility signals and patterns correctly based on baseline logic', () => {
        const profile = calculateGovernanceProfile(schema, baselineRecord);

        // Pattern 1: Traceability >= 2 and Accountability <= 1
        expect(profile.patterns.some(p => p.name === 'Strong Applied Practice, Weak Oversight')).toBe(true);

        // Pattern 3: Risk Management >= 2 and Policy Alignment <= 1
        expect(profile.patterns.some(p => p.name === 'High Awareness, Low Institutionalisation')).toBe(true);

        expect(profile.fragilitySignals).toContain('Accountability roles are unclear or distributed too thinly.');
        expect(profile.fragilitySignals).toContain('Internal practices are not consistently mapped to formal policy.');
    });

    it('exports valid JSON and Markdown strings', () => {
        const jsonStr = exportToJSON(baselineRecord);
        const parsed = JSON.parse(jsonStr);
        expect(parsed.assessment_id).toBe('test-rec-1');
        expect(parsed.organisation_name).toBe('St. Jude Healthcare Trust');

        const profile = calculateGovernanceProfile(schema, baselineRecord);
        const mdStr = exportToMarkdown(baselineRecord, profile);
        expect(mdStr).toContain('# AI Governance Profile: St. Jude Healthcare Trust');
        expect(mdStr).toContain('**Governance Readiness Index**: 62%');
        expect(mdStr).toContain('Established Maturity');
    });
});
