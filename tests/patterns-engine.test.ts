import { describe, it, expect } from 'vitest';
import { calculateGovernanceProfile } from '../src/logic/assessment';
import schemaData from '../MATURITY_SCHEMA.json';
import type { Schema, AssessmentRecord } from '../src/types';

describe('B2.3: Pattern and Fragility Detection Engine', () => {
    const schema = schemaData as Schema;

    const baseRecord = (scores: Record<string, number>): AssessmentRecord => ({
        assessment_id: 'pattern-test',
        organisation_name: 'Pattern Test Lab',
        date_created: '2026-10-28',
        team_mode: false,
        scores,
        notes: {},
        artefacts: []
    });

    it('triggers Pattern 1: Strong Applied Practice, Weak Oversight on exact boundary conditions', () => {
        // Trigger condition: (traceability >= 2 || boundary_clarity >= 2) && accountability <= 1
        const triggering = baseRecord({ traceability: 2, accountability: 1 });
        const res = calculateGovernanceProfile(schema, triggering);
        expect(res.patterns.some(p => p.name === 'Strong Applied Practice, Weak Oversight')).toBe(true);
        expect(res.fragilitySignals).toContain('Accountability roles are unclear or distributed too thinly.');

        // Non-triggering: accountability >= 2
        const nonTriggering = baseRecord({ traceability: 2, accountability: 2 });
        const res2 = calculateGovernanceProfile(schema, nonTriggering);
        expect(res2.patterns.some(p => p.name === 'Strong Applied Practice, Weak Oversight')).toBe(false);

        // Non-triggering: both traceability and boundary_clarity < 2
        const nonTriggering2 = baseRecord({ traceability: 1, boundary_clarity: 1, accountability: 0 });
        const res3 = calculateGovernanceProfile(schema, nonTriggering2);
        expect(res3.patterns.some(p => p.name === 'Strong Applied Practice, Weak Oversight')).toBe(false);
    });

    it('triggers Pattern 2: High Reliance, Low Reflection on exact boundary conditions', () => {
        // Trigger condition: risk_management >= 2 && review_practices <= 1
        const triggering = baseRecord({ risk_management: 2, review_practices: 1 });
        const res = calculateGovernanceProfile(schema, triggering);
        expect(res.patterns.some(p => p.name === 'High Reliance, Low Reflection')).toBe(true);
        expect(res.fragilitySignals).toContain('Review cycles are informal or non-existent for high-impact systems.');

        // Non-triggering: review_practices >= 2
        const nonTriggering = baseRecord({ risk_management: 2, review_practices: 2 });
        const res2 = calculateGovernanceProfile(schema, nonTriggering);
        expect(res2.patterns.some(p => p.name === 'High Reliance, Low Reflection')).toBe(false);

        // Non-triggering: risk_management <= 1
        const nonTriggering2 = baseRecord({ risk_management: 1, review_practices: 0 });
        const res3 = calculateGovernanceProfile(schema, nonTriggering2);
        expect(res3.patterns.some(p => p.name === 'High Reliance, Low Reflection')).toBe(false);
    });

    it('triggers Pattern 3: High Awareness, Low Institutionalisation on exact boundary conditions', () => {
        // Trigger condition: risk_management >= 2 && (policy_alignment <= 1 || accountability <= 1)
        const triggering = baseRecord({ risk_management: 2, policy_alignment: 1, accountability: 2 });
        const res = calculateGovernanceProfile(schema, triggering);
        expect(res.patterns.some(p => p.name === 'High Awareness, Low Institutionalisation')).toBe(true);
        expect(res.fragilitySignals).toContain('Internal practices are not consistently mapped to formal policy.');

        // Non-triggering: both policy_alignment >= 2 and accountability >= 2
        const nonTriggering = baseRecord({ risk_management: 2, policy_alignment: 2, accountability: 2 });
        const res2 = calculateGovernanceProfile(schema, nonTriggering);
        expect(res2.patterns.some(p => p.name === 'High Awareness, Low Institutionalisation')).toBe(false);
    });

    it('triggers Pattern 4: Compliance-First, Learning-Slow on exact boundary conditions', () => {
        // Trigger condition: policy_alignment >= 2 && learning_capability <= 1
        const triggering = baseRecord({ policy_alignment: 2, learning_capability: 1 });
        const res = calculateGovernanceProfile(schema, triggering);
        expect(res.patterns.some(p => p.name === 'Compliance-First, Learning-Slow')).toBe(true);
        expect(res.fragilitySignals).toContain('Lack of post-deployment feedback loops into governance design.');

        // Non-triggering: learning_capability >= 2
        const nonTriggering = baseRecord({ policy_alignment: 2, learning_capability: 2 });
        const res2 = calculateGovernanceProfile(schema, nonTriggering);
        expect(res2.patterns.some(p => p.name === 'Compliance-First, Learning-Slow')).toBe(false);
    });

    it('triggers Pattern 5: Operational Deployment Without Defined Boundaries (Candidate A)', () => {
        // Trigger condition: boundary_clarity <= 1 && (risk_management >= 2 || traceability >= 2)
        const triggering = baseRecord({ boundary_clarity: 1, risk_management: 2, accountability: 2 });
        const res = calculateGovernanceProfile(schema, triggering);
        expect(res.patterns.some(p => p.name === 'Operational Deployment Without Defined Boundaries')).toBe(true);
        expect(res.fragilitySignals.some(s => s.includes('Workflows operate without explicit limits'))).toBe(true);

        // Non-triggering: boundary_clarity >= 2
        const nonTriggering = baseRecord({ boundary_clarity: 2, risk_management: 2 });
        const res2 = calculateGovernanceProfile(schema, nonTriggering);
        expect(res2.patterns.some(p => p.name === 'Operational Deployment Without Defined Boundaries')).toBe(false);
    });

    it('triggers Pattern 6: Active Experimentation Without Policy Foundation (Candidate B)', () => {
        // Trigger condition: learning_capability >= 2 && policy_alignment <= 0
        const triggering = baseRecord({ learning_capability: 2, policy_alignment: 0 });
        const res = calculateGovernanceProfile(schema, triggering);
        expect(res.patterns.some(p => p.name === 'Active Experimentation Without Policy Foundation')).toBe(true);
        expect(res.fragilitySignals.some(s => s.includes('Accelerated AI experimentation without baseline policy'))).toBe(true);

        // Non-triggering: policy_alignment >= 1
        const nonTriggering = baseRecord({ learning_capability: 2, policy_alignment: 1 });
        const res2 = calculateGovernanceProfile(schema, nonTriggering);
        expect(res2.patterns.some(p => p.name === 'Active Experimentation Without Policy Foundation')).toBe(false);
    });

    it('uses proportionate language avoiding implication of regulatory violation', () => {
        const record = baseRecord({
            traceability: 2,
            boundary_clarity: 1,
            risk_management: 2,
            accountability: 1,
            policy_alignment: 0,
            review_practices: 1,
            learning_capability: 2
        });

        const profile = calculateGovernanceProfile(schema, record);
        profile.fragilitySignals.forEach(signal => {
            // Should not claim legal violation or regulatory penalty
            expect(signal).not.toMatch(/illegal|violates law|regulatory penalty|certified failure/i);
        });
    });
});
