import { describe, it, expect, beforeEach } from 'vitest';
import {
    STORAGE_KEYS,
    loadAssessmentFromStorage,
    saveAssessmentToStorage,
    clearAssessmentFromStorage,
    loadHistoryFromStorage,
    saveHistoryToStorage,
    normalizeAssessmentRecord
} from '../src/logic/storage';
import type { AssessmentRecord } from '../src/types';

describe('B1.5: Safe Storage, Validation and Legacy Migration', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it('loads and transparently migrates a legacy assessment from ai_gov_assessment to versioned key', () => {
        const legacyData = {
            assessment_id: 'legacy-123',
            organisation_name: 'Legacy Academy',
            date_created: '2026-03-01',
            team_mode: false,
            scores: {
                traceability: 2,
                boundary_clarity: 1
            },
            notes: {
                traceability: 'Legacy note'
            },
            artefacts: [
                { type: 'workflow', ref: 'WF-LEGACY', name: 'Legacy Workflow' }
            ]
        };

        // Seed storage with legacy key ONLY
        window.localStorage.setItem(STORAGE_KEYS.LEGACY_CURRENT, JSON.stringify(legacyData));

        const loaded = loadAssessmentFromStorage(window.localStorage);
        expect(loaded).toBeDefined();
        expect(loaded?.assessment_id).toBe('legacy-123');
        expect(loaded?.organisation_name).toBe('Legacy Academy');
        expect(loaded?.scores.traceability).toBe(2);

        // Verify it was migrated to the new versioned key
        const migratedJson = window.localStorage.getItem(STORAGE_KEYS.CURRENT_V1);
        expect(migratedJson).toBeTruthy();
        const migratedRecord = JSON.parse(migratedJson!);
        expect(migratedRecord.assessment_id).toBe('legacy-123');

        // And legacy key is still preserved for backwards compatibility
        expect(window.localStorage.getItem(STORAGE_KEYS.LEGACY_CURRENT)).toBeTruthy();
    });

    it('creates a non-destructive corrupted backup and returns null when stored JSON is invalid syntax', () => {
        // Corrupt data with invalid syntax
        window.localStorage.setItem(STORAGE_KEYS.CURRENT_V1, '{ invalid JSON string syntax :::');

        const loaded = loadAssessmentFromStorage(window.localStorage);
        expect(loaded).toBeNull();

        // Check that a backup key was created
        const allKeys = Object.keys(window.localStorage);
        const backupKey = allKeys.find(k => k.startsWith(STORAGE_KEYS.CORRUPTED_BACKUP_PREFIX));
        expect(backupKey).toBeDefined();
        expect(window.localStorage.getItem(backupKey!)).toBe('{ invalid JSON string syntax :::');
    });

    it('normalizes partial records by filling missing fields with safe default structures', () => {
        const partialData = {
            organisation_name: 'Partial Org',
            scores: {
                traceability: 3
            }
            // notes, artefacts, capabilityNotes, governanceNotes completely omitted
        };

        const normalized = normalizeAssessmentRecord(partialData);
        expect(normalized).toBeDefined();
        expect(normalized?.organisation_name).toBe('Partial Org');
        expect(normalized?.scores.traceability).toBe(3);
        expect(normalized?.notes).toEqual({});
        expect(normalized?.artefacts).toEqual([]);
        expect(normalized?.capabilityNotes).toBe('');
        expect(normalized?.governanceNotes).toBe('');
        expect(normalized?.team_mode).toBe(false);
    });

    it('saves dual-key records to maintain compatibility with legacy consumers and embeds', () => {
        const sampleRecord: AssessmentRecord = {
            assessment_id: 'rec-dual-99',
            organisation_name: 'Studio Embedded Institution',
            date_created: '2026-04-20',
            team_mode: true,
            scores: { risk_management: 3 },
            notes: {},
            artefacts: []
        };

        saveAssessmentToStorage(sampleRecord, window.localStorage);

        // Both keys must exist with identical content
        const v1 = window.localStorage.getItem(STORAGE_KEYS.CURRENT_V1);
        const legacy = window.localStorage.getItem(STORAGE_KEYS.LEGACY_CURRENT);
        expect(v1).toBeTruthy();
        expect(legacy).toBeTruthy();
        expect(JSON.parse(v1!)).toEqual(JSON.parse(legacy!));
    });

    it('caps history buffer at maximum 5 entries and handles legacy history migration', () => {
        const legacyHistory = Array.from({ length: 7 }, (_, i) => ({
            assessment_id: `hist-${i}`,
            organisation_name: `Org ${i}`,
            date_created: `2026-01-0${i + 1}`,
            team_mode: false,
            scores: { traceability: i % 4 },
            notes: {},
            artefacts: []
        }));

        window.localStorage.setItem(STORAGE_KEYS.LEGACY_HISTORY, JSON.stringify(legacyHistory));

        const loadedHistory = loadHistoryFromStorage(window.localStorage);
        expect(loadedHistory).toHaveLength(7);

        // Saving history caps at 5
        saveHistoryToStorage(loadedHistory, window.localStorage);
        const storedHistory = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.HISTORY_V1)!);
        expect(storedHistory).toHaveLength(5);
        expect(storedHistory[0].assessment_id).toBe('hist-0');
        expect(storedHistory[4].assessment_id).toBe('hist-4');
    });

    it('clearAssessment removes both versioned and legacy assessment keys', () => {
        window.localStorage.setItem(STORAGE_KEYS.CURRENT_V1, JSON.stringify({ test: 1 }));
        window.localStorage.setItem(STORAGE_KEYS.LEGACY_CURRENT, JSON.stringify({ test: 1 }));

        clearAssessmentFromStorage(window.localStorage);

        expect(window.localStorage.getItem(STORAGE_KEYS.CURRENT_V1)).toBeNull();
        expect(window.localStorage.getItem(STORAGE_KEYS.LEGACY_CURRENT)).toBeNull();
    });
});
