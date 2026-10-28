import { describe, it, expect } from 'vitest';
import { validateAssessmentRecord, DEFAULT_DIMENSION_IDS } from '../src/logic/validation';

describe('B1.4: Comparison JSON Validation', () => {
    const validFullRecord = {
        assessment_id: 'rec-001',
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
            traceability: 'Full logs maintained.'
        },
        artefacts: [
            { type: 'workflow', ref: 'WF-001', name: 'Clinical Triage' }
        ],
        capabilityNotes: 'Capability notes',
        governanceNotes: 'Governance notes'
    };

    it('passes validation for a well-formed complete assessment record', () => {
        const result = validateAssessmentRecord(validFullRecord, DEFAULT_DIMENSION_IDS);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.record).toBeDefined();
        expect(result.record?.organisation_name).toBe('St. Jude Healthcare Trust');
        expect(result.record?.scores.traceability).toBe(3);
        expect(result.record?.team_mode).toBe(true);
    });

    it('rejects non-object inputs such as strings, numbers, null, or arrays', () => {
        expect(validateAssessmentRecord(null).isValid).toBe(false);
        expect(validateAssessmentRecord(undefined).isValid).toBe(false);
        expect(validateAssessmentRecord('not json object').isValid).toBe(false);
        expect(validateAssessmentRecord([1, 2, 3]).isValid).toBe(false);
    });

    it('rejects records with missing or empty scores object', () => {
        const noScores = { organisation_name: 'Test Org' };
        const resultNoScores = validateAssessmentRecord(noScores);
        expect(resultNoScores.isValid).toBe(false);
        expect(resultNoScores.errors[0]).toContain("Missing or invalid 'scores' object");

        const emptyScores = { scores: {} };
        const resultEmpty = validateAssessmentRecord(emptyScores);
        expect(resultEmpty.isValid).toBe(false);
        expect(resultEmpty.errors[0]).toContain("The 'scores' object is empty");
    });

    it('rejects unrecognised dimension identifiers', () => {
        const badDim = {
            scores: {
                traceability: 2,
                unrecognised_dimension_xyz: 1
            }
        };
        const result = validateAssessmentRecord(badDim);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('unrecognised_dimension_xyz'))).toBe(true);
    });

    it('rejects invalid score types such as strings, floating-point numbers, NaN, and booleans', () => {
        const invalidTypes = {
            scores: {
                traceability: '3' as any,
                risk_management: 2.5,
                accountability: NaN
            }
        };
        const result = validateAssessmentRecord(invalidTypes);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(3);
        expect(result.errors.some(e => e.includes('must be an integer'))).toBe(true);
    });

    it('rejects out-of-range scores (e.g. -1 or 4) without silently coercing them', () => {
        const outOfRange = {
            scores: {
                traceability: -1,
                risk_management: 4,
                accountability: 99
            }
        };
        const result = validateAssessmentRecord(outOfRange);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBe(3);
        expect(result.errors[0]).toContain('between 0 and 3');
        expect(result.errors[1]).toContain('between 0 and 3');
        expect(result.errors[2]).toContain('between 0 and 3');
    });

    it('rejects invalid artefact entries with missing ref or invalid type', () => {
        const badArtefacts = {
            scores: { traceability: 2 },
            artefacts: [
                { type: 'unsupported_type', ref: 'WF-1' },
                { missing_ref: true }
            ]
        };
        const result = validateAssessmentRecord(badArtefacts);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('invalid type'))).toBe(true);
        expect(result.errors.some(e => e.includes("missing a string 'ref'"))).toBe(true);
    });

    it('handles unexpected metadata types gracefully with explicit errors', () => {
        const badMetadata = {
            scores: { traceability: 2 },
            organisation_name: 12345, // invalid type
            team_mode: 'yes' // invalid type
        };
        const result = validateAssessmentRecord(badMetadata);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('organisation_name'))).toBe(true);
        expect(result.errors.some(e => e.includes('team_mode'))).toBe(true);
    });
});
