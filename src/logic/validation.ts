import type { AssessmentRecord } from '../types';

export const DEFAULT_DIMENSION_IDS = [
    'traceability',
    'boundary_clarity',
    'risk_management',
    'accountability',
    'policy_alignment',
    'review_practices',
    'learning_capability'
];

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    record?: AssessmentRecord;
}

/**
 * Validates an unknown object against the AssessmentRecord schema.
 * Rejects invalid types, out-of-range scores, or malformed structures.
 */
export function validateAssessmentRecord(
    data: unknown,
    permittedDimensionIds: string[] = DEFAULT_DIMENSION_IDS
): ValidationResult {
    const errors: string[] = [];

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return {
            isValid: false,
            errors: ['The uploaded file does not contain a valid JSON object.']
        };
    }

    const obj = data as Record<string, unknown>;

    // 1. Validate scores
    if (!obj.scores || typeof obj.scores !== 'object' || Array.isArray(obj.scores)) {
        errors.push("Missing or invalid 'scores' object. Assessment must contain scores mapping.");
    } else {
        const scoresObj = obj.scores as Record<string, unknown>;
        const scoreKeys = Object.keys(scoresObj);

        if (scoreKeys.length === 0) {
            errors.push("The 'scores' object is empty. At least one dimension score is required.");
        }

        for (const [dimId, scoreVal] of Object.entries(scoresObj)) {
            if (!permittedDimensionIds.includes(dimId)) {
                errors.push(`Unrecognised dimension identifier: "${dimId}".`);
                continue;
            }

            if (typeof scoreVal !== 'number' || !Number.isInteger(scoreVal)) {
                errors.push(`Score for dimension "${dimId}" must be an integer (got ${typeof scoreVal === 'number' && isNaN(scoreVal) ? 'NaN' : JSON.stringify(scoreVal)}).`);
                continue;
            }

            if (scoreVal < 0 || scoreVal > 3) {
                errors.push(`Score for dimension "${dimId}" must be between 0 and 3 (got ${scoreVal}).`);
            }
        }
    }

    // 2. Validate organisation_name
    if (obj.organisation_name !== undefined && typeof obj.organisation_name !== 'string') {
        errors.push("Field 'organisation_name' must be a string if provided.");
    }

    // 3. Validate date_created
    if (obj.date_created !== undefined && typeof obj.date_created !== 'string') {
        errors.push("Field 'date_created' must be a string if provided.");
    }

    // 4. Validate team_mode
    if (obj.team_mode !== undefined && typeof obj.team_mode !== 'boolean') {
        errors.push("Field 'team_mode' must be a boolean if provided.");
    }

    // 5. Validate notes
    if (obj.notes !== undefined) {
        if (!obj.notes || typeof obj.notes !== 'object' || Array.isArray(obj.notes)) {
            errors.push("Field 'notes' must be an object if provided.");
        } else {
            for (const [k, v] of Object.entries(obj.notes as Record<string, unknown>)) {
                if (typeof v !== 'string') {
                    errors.push(`Note for dimension "${k}" must be a string.`);
                }
            }
        }
    }

    // 6. Validate artefacts
    if (obj.artefacts !== undefined) {
        if (!Array.isArray(obj.artefacts)) {
            errors.push("Field 'artefacts' must be an array if provided.");
        } else {
            const validTypes = ['workflow', 'decision', 'document'];
            obj.artefacts.forEach((art, idx) => {
                if (!art || typeof art !== 'object') {
                    errors.push(`Artefact at index ${idx} must be an object.`);
                    return;
                }
                const a = art as Record<string, unknown>;
                if (typeof a.ref !== 'string') {
                    errors.push(`Artefact at index ${idx} is missing a string 'ref'.`);
                }
                if (a.name !== undefined && typeof a.name !== 'string') {
                    errors.push(`Artefact at index ${idx} 'name' must be a string.`);
                }
                if (a.type !== undefined && !validTypes.includes(String(a.type))) {
                    errors.push(`Artefact at index ${idx} has invalid type "${String(a.type)}". Expected one of: ${validTypes.join(', ')}.`);
                }
            });
        }
    }

    // 7. Validate capabilityNotes & governanceNotes
    if (obj.capabilityNotes !== undefined && typeof obj.capabilityNotes !== 'string') {
        errors.push("Field 'capabilityNotes' must be a string if provided.");
    }
    if (obj.governanceNotes !== undefined && typeof obj.governanceNotes !== 'string') {
        errors.push("Field 'governanceNotes' must be a string if provided.");
    }

    if (errors.length > 0) {
        return {
            isValid: false,
            errors
        };
    }

    // Construct clean, type-safe AssessmentRecord
    const rawScores = (obj.scores || {}) as Record<string, number>;
    const cleanScores: { [dimId: string]: number } = {};
    for (const [k, v] of Object.entries(rawScores)) {
        if (permittedDimensionIds.includes(k) && Number.isInteger(v) && v >= 0 && v <= 3) {
            cleanScores[k] = v;
        }
    }

    const rawNotes = (obj.notes || {}) as Record<string, string>;
    const cleanNotes: { [dimId: string]: string } = {};
    for (const [k, v] of Object.entries(rawNotes)) {
        if (typeof v === 'string') {
            cleanNotes[k] = v;
        }
    }

    const rawArtefacts = Array.isArray(obj.artefacts) ? obj.artefacts : [];
    const cleanArtefacts = rawArtefacts.map((art) => {
        const a = art as Record<string, unknown>;
        const typeStr = String(a.type || 'workflow');
        const validTypes: Array<'workflow' | 'decision' | 'document'> = ['workflow', 'decision', 'document'];
        const safeType = validTypes.includes(typeStr as any)
            ? (typeStr as 'workflow' | 'decision' | 'document')
            : 'workflow';
        return {
            type: safeType,
            ref: typeof a.ref === 'string' ? a.ref : '',
            name: typeof a.name === 'string' ? a.name : 'Artefact'
        };
    });

    const validatedRecord: AssessmentRecord = {
        assessment_id: typeof obj.assessment_id === 'string' && obj.assessment_id ? obj.assessment_id : 'import-' + Date.now(),
        organisation_name: typeof obj.organisation_name === 'string' ? obj.organisation_name : 'Imported Assessment',
        date_created: typeof obj.date_created === 'string' ? obj.date_created : new Date().toISOString().split('T')[0],
        team_mode: Boolean(obj.team_mode),
        scores: cleanScores,
        notes: cleanNotes,
        artefacts: cleanArtefacts,
        capabilityNotes: typeof obj.capabilityNotes === 'string' ? obj.capabilityNotes : '',
        governanceNotes: typeof obj.governanceNotes === 'string' ? obj.governanceNotes : ''
    };

    return {
        isValid: true,
        errors: [],
        record: validatedRecord
    };
}
