export interface Level {
    id: number;
    name: string;
    description: string;
}

export interface Dimension {
    id: string;
    name: string;
    description: string;
    reflective_prompts: string[];
    levels: string[]; // Descriptive text for each scoring level 0-3
}

export interface Schema {
    dimensions: Dimension[];
    levels: Level[];
}

export interface AssessmentRecord {
    assessment_id: string;
    organisation_name: string;
    date_created: string;
    team_mode: boolean;
    scores: { [dimensionId: string]: number };
    notes: { [dimensionId: string]: string };
    artefacts: Array<{ type: 'workflow' | 'decision' | 'document', ref: string, name: string }>;
    capabilityNotes?: string;
    governanceNotes?: string;
}

export interface ComparisonResult {
    previousDate: string;
    deltas: { [dimensionId: string]: number };
    overallChange: number;
}

export interface GovernanceProfile {
    overallMaturity: string;
    strong: string[];
    developing: string[];
    weak: string[];
    patterns: Array<{
        name: string;
        implication: string;
    }>;
    fragilitySignals: string[];
    improvementDirections: string[];
    reflectionPrompts: string[];
    readinessIndex: number;
    gapActions: Array<{ dimension: string, action: string, priority: 'Urgent' | 'Strategic' }>;
    comparison?: ComparisonResult;
}
