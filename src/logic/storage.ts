import type { AssessmentRecord } from '../types';
import { DEFAULT_DIMENSION_IDS } from './validation';

export const STORAGE_KEYS = {
    CURRENT_V1: 'cp_aigov_assessment_v1',
    HISTORY_V1: 'cp_aigov_history_v1',
    LEGACY_CURRENT: 'ai_gov_assessment',
    LEGACY_HISTORY: 'ai_gov_history',
    CORRUPTED_BACKUP_PREFIX: 'cp_aigov_corrupted_backup_'
};

/**
 * Normalizes an unknown object into a valid, safe AssessmentRecord.
 * Retains all valid fields and fills missing or partial properties with safe defaults.
 */
export function normalizeAssessmentRecord(
    raw: unknown,
    permittedDimensions: string[] = DEFAULT_DIMENSION_IDS,
    defaultId: string = 'rec-' + Date.now()
): AssessmentRecord | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return null;
    }

    const obj = raw as Record<string, unknown>;

    // Clean scores
    const cleanScores: { [dimId: string]: number } = {};
    if (obj.scores && typeof obj.scores === 'object' && !Array.isArray(obj.scores)) {
        for (const [dimId, score] of Object.entries(obj.scores as Record<string, unknown>)) {
            if (permittedDimensions.includes(dimId) && typeof score === 'number' && Number.isInteger(score) && score >= 0 && score <= 3) {
                cleanScores[dimId] = score;
            }
        }
    }

    // Clean notes
    const cleanNotes: { [dimId: string]: string } = {};
    if (obj.notes && typeof obj.notes === 'object' && !Array.isArray(obj.notes)) {
        for (const [dimId, note] of Object.entries(obj.notes as Record<string, unknown>)) {
            if (typeof note === 'string') {
                cleanNotes[dimId] = note;
            }
        }
    }

    // Clean artefacts
    const cleanArtefacts: Array<{ type: 'workflow' | 'decision' | 'document'; ref: string; name: string }> = [];
    if (Array.isArray(obj.artefacts)) {
        const validTypes = ['workflow', 'decision', 'document'];
        for (const item of obj.artefacts) {
            if (item && typeof item === 'object') {
                const a = item as Record<string, unknown>;
                const typeStr = String(a.type || 'workflow');
                const safeType = validTypes.includes(typeStr)
                    ? (typeStr as 'workflow' | 'decision' | 'document')
                    : 'workflow';
                cleanArtefacts.push({
                    type: safeType,
                    ref: typeof a.ref === 'string' ? a.ref : '',
                    name: typeof a.name === 'string' ? a.name : 'Artefact'
                });
            }
        }
    }

    return {
        assessment_id: typeof obj.assessment_id === 'string' && obj.assessment_id ? obj.assessment_id : defaultId,
        organisation_name: typeof obj.organisation_name === 'string' ? obj.organisation_name : '',
        date_created: typeof obj.date_created === 'string' && obj.date_created ? obj.date_created : new Date().toISOString().split('T')[0],
        team_mode: Boolean(obj.team_mode),
        scores: cleanScores,
        notes: cleanNotes,
        artefacts: cleanArtefacts,
        capabilityNotes: typeof obj.capabilityNotes === 'string' ? obj.capabilityNotes : '',
        governanceNotes: typeof obj.governanceNotes === 'string' ? obj.governanceNotes : ''
    };
}

/**
 * Loads and migrates assessment record from localStorage.
 * Handles legacy keys and corrupted storage safely without throwing.
 */
export function loadAssessmentFromStorage(
    storage: Storage = window.localStorage,
    permittedDimensions: string[] = DEFAULT_DIMENSION_IDS
): AssessmentRecord | null {
    try {
        let rawData = storage.getItem(STORAGE_KEYS.CURRENT_V1);
        let fromLegacy = false;

        if (!rawData) {
            rawData = storage.getItem(STORAGE_KEYS.LEGACY_CURRENT);
            fromLegacy = true;
        }

        if (!rawData) {
            return null;
        }

        let parsed: unknown;
        try {
            parsed = JSON.parse(rawData);
        } catch (syntaxErr) {
            console.warn('[Storage] Corrupted assessment JSON detected. Creating backup.', syntaxErr);
            const backupKey = `${STORAGE_KEYS.CORRUPTED_BACKUP_PREFIX}assessment_${Date.now()}`;
            try {
                storage.setItem(backupKey, rawData);
            } catch (backupErr) {
                console.error('[Storage] Failed to write corrupted backup', backupErr);
            }
            return null;
        }

        const normalized = normalizeAssessmentRecord(parsed, permittedDimensions);
        if (normalized && fromLegacy) {
            // Transparently migrate to versioned key
            try {
                storage.setItem(STORAGE_KEYS.CURRENT_V1, JSON.stringify(normalized));
            } catch (writeErr) {
                console.error('[Storage] Failed to migrate legacy assessment key', writeErr);
            }
        }

        return normalized;
    } catch (err) {
        console.error('[Storage] Unexpected error loading assessment', err);
        return null;
    }
}

/**
 * Saves current assessment record to both namespaced versioned key and legacy key.
 */
export function saveAssessmentToStorage(
    record: AssessmentRecord,
    storage: Storage = window.localStorage
): void {
    try {
        const serialized = JSON.stringify(record);
        storage.setItem(STORAGE_KEYS.CURRENT_V1, serialized);
        // Maintain backward compatibility for external consumers or Studio embeds
        storage.setItem(STORAGE_KEYS.LEGACY_CURRENT, serialized);
    } catch (err) {
        console.error('[Storage] Failed to save assessment to storage', err);
    }
}

/**
 * Clears current assessment record from storage.
 */
export function clearAssessmentFromStorage(storage: Storage = window.localStorage): void {
    try {
        storage.removeItem(STORAGE_KEYS.CURRENT_V1);
        storage.removeItem(STORAGE_KEYS.LEGACY_CURRENT);
    } catch (err) {
        console.error('[Storage] Failed to clear assessment from storage', err);
    }
}

/**
 * Loads assessment history array from localStorage.
 */
export function loadHistoryFromStorage(
    storage: Storage = window.localStorage,
    permittedDimensions: string[] = DEFAULT_DIMENSION_IDS
): AssessmentRecord[] {
    try {
        let rawData = storage.getItem(STORAGE_KEYS.HISTORY_V1);
        let fromLegacy = false;

        if (!rawData) {
            rawData = storage.getItem(STORAGE_KEYS.LEGACY_HISTORY);
            fromLegacy = true;
        }

        if (!rawData) {
            return [];
        }

        let parsed: unknown;
        try {
            parsed = JSON.parse(rawData);
        } catch (syntaxErr) {
            console.warn('[Storage] Corrupted history JSON detected. Creating backup.', syntaxErr);
            const backupKey = `${STORAGE_KEYS.CORRUPTED_BACKUP_PREFIX}history_${Date.now()}`;
            try {
                storage.setItem(backupKey, rawData);
            } catch {
                // Ignore backup storage failure
            }
            return [];
        }

        if (!Array.isArray(parsed)) {
            return [];
        }

        const validHistory: AssessmentRecord[] = [];
        for (const item of parsed) {
            const normalized = normalizeAssessmentRecord(item, permittedDimensions);
            if (normalized) {
                validHistory.push(normalized);
            }
        }

        if (fromLegacy && validHistory.length > 0) {
            try {
                storage.setItem(STORAGE_KEYS.HISTORY_V1, JSON.stringify(validHistory));
            } catch {
                // Ignore migration write error
            }
        }

        return validHistory;
    } catch (err) {
        console.error('[Storage] Unexpected error loading history', err);
        return [];
    }
}

/**
 * Saves history array (capped at 5 entries).
 */
export function saveHistoryToStorage(
    history: AssessmentRecord[],
    storage: Storage = window.localStorage
): void {
    try {
        const capped = history.slice(0, 5);
        const serialized = JSON.stringify(capped);
        storage.setItem(STORAGE_KEYS.HISTORY_V1, serialized);
        storage.setItem(STORAGE_KEYS.LEGACY_HISTORY, serialized);
    } catch (err) {
        console.error('[Storage] Failed to save history to storage', err);
    }
}
