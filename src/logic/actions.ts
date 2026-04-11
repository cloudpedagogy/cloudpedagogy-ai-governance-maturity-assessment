export interface GapAction {
    dimensionId: string;
    level: number;
    action: string;
    priority: 'Urgent' | 'Strategic';
}

export const GAP_ACTION_MAP: GapAction[] = [
    // Traceability
    { dimensionId: 'traceability', level: 0, action: 'Establish mandatory logging and versioning standards for all AI-supported research and teaching artefacts.', priority: 'Urgent' },
    { dimensionId: 'traceability', level: 1, action: 'Standardise provenance metadata schemas across departments.', priority: 'Strategic' },
    
    // Boundary Clarity
    { dimensionId: 'boundary_clarity', level: 0, action: 'Define a "Traffic Light" system for AI tasks (e.g., Green: Permitted, Amber: Conditional, Red: Prohibited).', priority: 'Urgent' },
    { dimensionId: 'boundary_clarity', level: 1, action: 'Publish a "Human-in-the-loop" charter defining mandatory intervention points for critical workflows.', priority: 'Strategic' },
    
    // Risk Management
    { dimensionId: 'risk_management', level: 0, action: 'Conduct a high-level inventory of all active AI tools and their associated impact levels.', priority: 'Urgent' },
    { dimensionId: 'risk_management', level: 1, action: 'Implement a structured Risk Scoring system for and perform periodic failure mode audits.', priority: 'Strategic' },
    
    // Accountability
    { dimensionId: 'accountability', level: 0, action: 'Formally appoint an AI Governance Lead and define cross-functional accountability roles.', priority: 'Urgent' },
    { dimensionId: 'accountability', level: 1, action: 'Review and update institutional contracts and employment standards for AI accountability.', priority: 'Strategic' },
    
    // Policy Alignment
    { dimensionId: 'policy_alignment', level: 0, action: 'Perform a gap analysis between existing IT policies and current AI usage patterns.', priority: 'Urgent' },
    { dimensionId: 'policy_alignment', level: 1, action: 'Integrate AI Governance into the Institutional Quality Framework.', priority: 'Strategic' },
    
    // Review Practices
    { dimensionId: 'review_practices', level: 0, action: 'Initiate monthly review cycles for any AI systems used in assessment or resource allocation.', priority: 'Urgent' },
    { dimensionId: 'review_practices', level: 1, action: 'Develop a peer-review protocol for validating AI interpretation models.', priority: 'Strategic' },
    
    // Learning Capability
    { dimensionId: 'learning_capability', level: 0, action: 'Create a central "Failure Register" to capture and learn from AI governance incidents.', priority: 'Urgent' },
    { dimensionId: 'learning_capability', level: 1, action: 'Establish a community of practice for shared governance learning across teams.', priority: 'Strategic' }
];

export function getActionsForGaps(scores: { [id: string]: number }): Array<{ dimension: string, action: string, priority: 'Urgent' | 'Strategic' }> {
    const actions: Array<{ dimension: string, action: string, priority: 'Urgent' | 'Strategic' }> = [];
    
    Object.entries(scores).forEach(([dimId, score]) => {
        if (score <= 1) {
            const match = GAP_ACTION_MAP.find(a => a.dimensionId === dimId && a.level === score);
            if (match) {
                actions.push({ dimension: dimId, action: match.action, priority: match.priority });
            }
        }
    });

    return actions;
}
