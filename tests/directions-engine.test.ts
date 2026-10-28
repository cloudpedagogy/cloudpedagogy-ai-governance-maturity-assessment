import { describe, it, expect } from 'vitest';
import { calculateGovernanceProfile } from '../src/logic/assessment';
import schemaData from '../MATURITY_SCHEMA.json';
import type { Schema, AssessmentRecord } from '../src/types';

describe('B2.2: Improvement Directions Engine Across Seven Dimensions', () => {
    const schema = schemaData as Schema;

    const createTestRecord = (scores: Record<string, number>): AssessmentRecord => ({
        assessment_id: 'test-rec-dir',
        organisation_name: 'Directions Test Org',
        date_created: '2026-10-28',
        team_mode: false,
        scores,
        notes: {},
        artefacts: []
    });

    const dimensionKeys = [
        'traceability',
        'boundary_clarity',
        'risk_management',
        'accountability',
        'policy_alignment',
        'review_practices',
        'learning_capability'
    ];

    it('provides dimension-specific remedial guidance for each dimension when scored weak (0 or 1)', () => {
        // Test each dimension individually at score 0
        dimensionKeys.forEach(dimId => {
            const scores: Record<string, number> = {};
            dimensionKeys.forEach(d => {
                scores[d] = 3; // set all others to 3
            });
            scores[dimId] = 0; // target dimension is 0

            const profile = calculateGovernanceProfile(schema, createTestRecord(scores));
            expect(profile.improvementDirections.length).toBeGreaterThan(0);

            switch (dimId) {
                case 'traceability':
                    expect(profile.improvementDirections.some(d => d.includes('audit trails for AI tool usage'))).toBe(true);
                    break;
                case 'boundary_clarity':
                    expect(profile.improvementDirections.some(d => d.includes('human-in-the-loop escalation triggers'))).toBe(true);
                    break;
                case 'risk_management':
                    expect(profile.improvementDirections.some(d => d.includes('AI risk classification framework'))).toBe(true);
                    break;
                case 'accountability':
                    expect(profile.improvementDirections.some(d => d.includes('Clarifying accountability roles'))).toBe(true);
                    break;
                case 'policy_alignment':
                    expect(profile.improvementDirections.some(d => d.includes('AI acceptable use policy'))).toBe(true);
                    break;
                case 'review_practices':
                    expect(profile.improvementDirections.some(d => d.includes('Formalising periodic review cycles'))).toBe(true);
                    break;
                case 'learning_capability':
                    expect(profile.improvementDirections.some(d => d.includes('post-incident debriefs'))).toBe(true);
                    break;
            }
        });
    });

    it('provides differentiated Level 2 strengthening guidance when no basic gaps (0 or 1) exist', () => {
        // Record with all 2s
        const scores: Record<string, number> = {
            traceability: 2,
            boundary_clarity: 2,
            risk_management: 2,
            accountability: 2,
            policy_alignment: 2,
            review_practices: 2,
            learning_capability: 2
        };

        const profile = calculateGovernanceProfile(schema, createTestRecord(scores));
        
        // Should contain Level 2 strengthening pathways, not Level 0/1 remedial priorities
        expect(profile.improvementDirections.some(d => d.includes('automated, continuous audit trails'))).toBe(true);
        expect(profile.improvementDirections.some(d => d.includes('technical guardrails and testing procedures'))).toBe(true);
        expect(profile.improvementDirections.some(d => d.includes('continuous monitoring and integrated incident response'))).toBe(true);
        expect(profile.improvementDirections.some(d => d.includes('executive-sponsored oversight'))).toBe(true);
        expect(profile.improvementDirections.some(d => d.includes('synchronized with evolving regulations'))).toBe(true);
        expect(profile.improvementDirections.some(d => d.includes('multi-stakeholder evaluation'))).toBe(true);
        expect(profile.improvementDirections.some(d => d.includes('automated guardrail updates and sector knowledge-sharing'))).toBe(true);
    });

    it('prioritizes remediating weak scores over Level 2 strengthening when both exist', () => {
        // 1 weak score (traceability = 0), rest are 2
        const scores: Record<string, number> = {
            traceability: 0,
            boundary_clarity: 2,
            risk_management: 2,
            accountability: 2,
            policy_alignment: 2,
            review_practices: 2,
            learning_capability: 2
        };

        const profile = calculateGovernanceProfile(schema, createTestRecord(scores));
        // Should only output the weak dimension priority, avoiding overwhelming the user with Level 2 advice
        expect(profile.improvementDirections.some(d => d.includes('audit trails for AI tool usage'))).toBe(true);
        expect(profile.improvementDirections.some(d => d.includes('automated, continuous audit trails'))).toBe(false);
    });

    it('returns advanced stress-testing directions when all dimensions are Level 3 (Comprehensive)', () => {
        const scores: Record<string, number> = {
            traceability: 3,
            boundary_clarity: 3,
            risk_management: 3,
            accountability: 3,
            policy_alignment: 3,
            review_practices: 3,
            learning_capability: 3
        };

        const profile = calculateGovernanceProfile(schema, createTestRecord(scores));
        expect(profile.improvementDirections).toContain('Continuing to stress-test governance resilience under increased AI deployment scale.');
        expect(profile.improvementDirections).toContain('Sharing internal governance patterns and benchmarks with sector partners.');
    });

    it('indicates partial assessment when not all dimensions have been answered', () => {
        const scores: Record<string, number> = {
            traceability: 1,
            boundary_clarity: 2
        };

        const profile = calculateGovernanceProfile(schema, createTestRecord(scores));
        expect(profile.improvementDirections.some(d => d.includes('Assessment is partially completed (2/7 dimensions scored)'))).toBe(true);
    });

    it('handles an empty assessment record cleanly', () => {
        const profile = calculateGovernanceProfile(schema, createTestRecord({}));
        expect(profile.improvementDirections).toContain('Complete assessment questions to generate targeted governance improvement directions.');
    });
});
