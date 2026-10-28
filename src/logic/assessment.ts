import type { AssessmentRecord, Schema, GovernanceProfile, ComparisonResult } from '../types';
import { getActionsForGaps } from './actions';
import defaultSchemaData from '../../MATURITY_SCHEMA.json';

const DIMENSION_IMPROVEMENT_DIRECTIONS: Record<string, { priority: string; strengthening: string }> = {
    traceability: {
        priority: "Establishing standard logging and audit trails for AI tool usage, system prompts, and model versions.",
        strengthening: "Advancing from periodic logs toward automated, continuous audit trails with reproducible provenance."
    },
    boundary_clarity: {
        priority: "Defining explicit operational boundaries and mandatory human-in-the-loop escalation triggers for automated tasks.",
        strengthening: "Codifying technical guardrails and testing procedures to enforce human-AI boundaries dynamically."
    },
    risk_management: {
        priority: "Implementing a structured AI risk classification framework with formal failure-mode assessments.",
        strengthening: "Transitioning from periodic risk assessments toward continuous monitoring and integrated incident response."
    },
    accountability: {
        priority: "Clarifying accountability roles, formal governance ownership, and institutional escalation paths for AI outcomes.",
        strengthening: "Establishing executive-sponsored oversight with cross-functional representation across technical and operational units."
    },
    policy_alignment: {
        priority: "Codifying an organisation-wide AI acceptable use policy aligned with institutional risk tolerance.",
        strengthening: "Establishing regular policy review cadences to keep internal standards synchronized with evolving regulations."
    },
    review_practices: {
        priority: "Formalising periodic review cycles and post-deployment audits for AI-supported operational workflows.",
        strengthening: "Augmenting internal periodic reviews with multi-stakeholder evaluation and independent validation."
    },
    learning_capability: {
        priority: "Embedding post-incident debriefs and governance feedback loops into institutional learning and capability programs.",
        strengthening: "Translating post-incident retrospectives into automated guardrail updates and sector knowledge-sharing."
    }
};

export function calculateGovernanceProfile(schema: Schema, record: AssessmentRecord, previousRecord?: AssessmentRecord): GovernanceProfile {
    const strong: string[] = [];
    const developing: string[] = [];
    const weak: string[] = [];
    
    schema.dimensions.forEach(dim => {
        const score = record.scores[dim.id] || 0;
        if (score >= 3) strong.push(dim.name);
        else if (score >= 1) developing.push(dim.name);
        else weak.push(dim.name);
    });

    const patterns: Array<{ name: string; implication: string }> = [];
    const fragilitySignals: string[] = [];

    // Helper to read score
    const score = (id: string) => record.scores[id] || 0;

    // Pattern 1: Strong applied practice but weak oversight
    if ((score('traceability') >= 2 || score('boundary_clarity') >= 2) && score('accountability') <= 1) {
        patterns.push({
            name: "Strong Applied Practice, Weak Oversight",
            implication: "Indicates fragile scaling where good local habits aren't yet institutionalised."
        });
        fragilitySignals.push("Accountability roles are unclear or distributed too thinly.");
    }

    // Pattern 2: High AI usage/reliance with low review capability
    if (score('risk_management') >= 2 && score('review_practices') <= 1) {
        patterns.push({
            name: "High Reliance, Low Reflection",
            implication: "Serious risk of unmonitored decision-making and automated bias accumulation."
        });
        fragilitySignals.push("Review cycles are informal or non-existent for high-impact systems.");
    }

    // Pattern 3: Clear awareness but weak institutionalisation
    if (score('risk_management') >= 2 && (score('policy_alignment') <= 1 || score('accountability') <= 1)) {
        patterns.push({
            name: "High Awareness, Low Institutionalisation",
            implication: "Governance depends on individual competence rather than systemic alignment."
        });
        fragilitySignals.push("Internal practices are not consistently mapped to formal policy.");
    }

    // Pattern 4: Compliance-First, Learning-Slow
    if (score('policy_alignment') >= 2 && score('learning_capability') <= 1) {
        patterns.push({
            name: "Compliance-First, Learning-Slow",
            implication: "The organization may follow rules but fails to adapt to new AI risks."
        });
        fragilitySignals.push("Lack of post-deployment feedback loops into governance design.");
    }

    // Pattern 5: Operational Deployment Without Defined Boundaries (Candidate A)
    if (score('boundary_clarity') <= 1 && (score('risk_management') >= 2 || score('traceability') >= 2)) {
        patterns.push({
            name: "Operational Deployment Without Defined Boundaries",
            implication: "AI workflows are tracked or evaluated, but lack explicit operational boundaries and human intervention thresholds."
        });
        fragilitySignals.push("Potential governance weakness: Workflows operate without explicit limits on automated decision authority or human override points.");
    }

    // Pattern 6: Active Experimentation Without Policy Foundation (Candidate B)
    if (score('learning_capability') >= 2 && score('policy_alignment') <= 0) {
        patterns.push({
            name: "Active Experimentation Without Policy Foundation",
            implication: "Teams actively iterate and learn with AI tools, but operate without foundational institutional acceptable-use guardrails."
        });
        fragilitySignals.push("Potential governance weakness: Accelerated AI experimentation without baseline policy increases unmanaged risk exposure.");
    }

    // Improvement Directions across all Seven Dimensions
    const scoredKeys = Object.keys(record.scores);
    const improvementDirections: string[] = [];

    if (scoredKeys.length === 0) {
        improvementDirections.push("Complete assessment questions to generate targeted governance improvement directions.");
    } else {
        const weakDimensions: string[] = [];
        const level2Dimensions: string[] = [];

        schema.dimensions.forEach(dim => {
            if (record.scores[dim.id] !== undefined) {
                const s = record.scores[dim.id];
                if (s <= 1) {
                    weakDimensions.push(dim.id);
                } else if (s === 2) {
                    level2Dimensions.push(dim.id);
                }
            }
        });

        if (weakDimensions.length > 0) {
            // Prioritize remedial guidance for weak or developing dimensions
            weakDimensions.forEach(dimId => {
                const dir = DIMENSION_IMPROVEMENT_DIRECTIONS[dimId];
                if (dir) {
                    improvementDirections.push(dir.priority);
                }
            });
        } else if (level2Dimensions.length > 0) {
            // Differentiated strengthening guidance for established Level 2 dimensions
            level2Dimensions.forEach(dimId => {
                const dir = DIMENSION_IMPROVEMENT_DIRECTIONS[dimId];
                if (dir) {
                    improvementDirections.push(dir.strengthening);
                }
            });
        } else {
            // All answered dimensions are Level 3 (Comprehensive)
            improvementDirections.push("Continuing to stress-test governance resilience under increased AI deployment scale.");
            improvementDirections.push("Sharing internal governance patterns and benchmarks with sector partners.");
        }

        if (scoredKeys.length < schema.dimensions.length) {
            improvementDirections.push(`Assessment is partially completed (${scoredKeys.length}/${schema.dimensions.length} dimensions scored). Complete remaining dimensions for full institutional directions.`);
        }
    }

    // Reflection Prompts based on Team Mode
    const prompts = record.team_mode ? [
        "Where is our team relying on individual heroics rather than governance systems?",
        "What would break in our workflow if our AI usage increased by 5x tomorrow?",
        "Which specific decisions are we making that currently lack clear human accountability?",
        "Where are our governance practices most inconsistent across the team?"
    ] : [
        "Where am I relying on individual competence rather than formal systems?",
        "What would fail if my AI use increased significantly?",
        "Which decisions currently lack clear accountability in my workflow?",
        "Where are my governance practices inconsistent?"
    ];

    // Overall Maturity Level (Minimal prominence)
    const scores = Object.values(record.scores);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / schema.dimensions.length : 0;
    let overallMaturity = "Emerging Maturity";
    if (avg >= 2.5) overallMaturity = "Advanced Maturity";
    else if (avg >= 1.5) overallMaturity = "Established Maturity";
    else if (avg >= 0.5) overallMaturity = "Developing Maturity";

    // Readiness Index Calculation (Equal weighting across 7 dimensions)
    const maxPossibleTotal = schema.dimensions.length * 3;
    const currentTotal = scores.reduce((a, b) => a + b, 0);
    const readinessIndex = Math.round((currentTotal / maxPossibleTotal) * 100);

    // Gap to Actions Integration
    const gapActions = getActionsForGaps(record.scores);

    // Snapshot Comparison Logic
    let comparison: ComparisonResult | undefined;
    if (previousRecord) {
        const deltas: { [dimensionId: string]: number } = {};
        let totalDelta = 0;
        schema.dimensions.forEach(dim => {
            const curr = record.scores[dim.id] || 0;
            const prev = previousRecord.scores[dim.id] || 0;
            deltas[dim.id] = curr - prev;
            totalDelta += (curr - prev);
        });
        
        const prevAvg = Object.values(previousRecord.scores).reduce((a, b) => a + b, 0) / schema.dimensions.length;
        const currentAvg = avg;
        
        comparison = {
            previousDate: previousRecord.date_created,
            deltas,
            overallChange: Math.round(((currentAvg - prevAvg) / 3) * 100) // Percentage shift relative to total scale
        };
    }

    return {
        overallMaturity,
        strong,
        developing,
        weak,
        patterns,
        fragilitySignals,
        improvementDirections,
        reflectionPrompts: prompts,
        readinessIndex,
        gapActions,
        comparison
    };
}

export function exportToJSON(record: AssessmentRecord): string {
    return JSON.stringify(record, null, 2);
}

function escapeMdCell(text: string): string {
    return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim();
}

export function exportToMarkdown(record: AssessmentRecord, profile: GovernanceProfile, schema?: Schema): string {
    const activeSchema = schema || (defaultSchemaData as Schema);
    const orgName = record.organisation_name ? record.organisation_name.trim() : 'Unnamed Organisation';
    const modeName = record.team_mode ? 'Team Discussion' : 'Individual Reflection';

    // Dimension breakdown rows
    const levelNames: Record<number, string> = {
        0: 'Unmanaged (0)',
        1: 'Documented (1)',
        2: 'Systematic (2)',
        3: 'Comprehensive (3)'
    };

    const tableRows = activeSchema.dimensions.map(dim => {
        const hasScore = record.scores[dim.id] !== undefined;
        const scoreVal = hasScore ? `${record.scores[dim.id]}/3` : 'Unscored';
        const levelLabel = hasScore ? (levelNames[record.scores[dim.id]] || `${record.scores[dim.id]}`) : 'Not Assessed';
        const noteText = record.notes && record.notes[dim.id] ? record.notes[dim.id].trim() : 'None recorded';
        
        const linkedArts = (record.artefacts || []).filter(a => a.dimensionId === dim.id);
        const artsText = linkedArts.length > 0
            ? linkedArts.map(a => `${a.ref}${a.name && a.name !== a.ref ? ` (${a.name})` : ''}`).join('; ')
            : 'None';

        return `| ${escapeMdCell(dim.name)} | ${escapeMdCell(scoreVal)} | ${escapeMdCell(levelLabel)} | ${escapeMdCell(noteText)} | ${escapeMdCell(artsText)} |`;
    }).join('\n');

    // Linked vs unlinked artefacts portfolio
    const unlinkedArts = (record.artefacts || []).filter(a => !a.dimensionId);
    const linkedArts = (record.artefacts || []).filter(a => Boolean(a.dimensionId));

    let artefactsSection = '### Linked Evidence by Dimension\n';
    if (linkedArts.length === 0) {
        artefactsSection += '- No dimension-specific evidence linked.\n';
    } else {
        activeSchema.dimensions.forEach(dim => {
            const items = linkedArts.filter(a => a.dimensionId === dim.id);
            if (items.length > 0) {
                artefactsSection += `- **${dim.name}**:\n`;
                items.forEach(a => {
                    artefactsSection += `  - [${a.type}] ${a.ref}${a.name && a.name !== a.ref ? ` — ${a.name}` : ''}\n`;
                });
            }
        });
    }

    if (unlinkedArts.length > 0) {
        artefactsSection += '\n### General / Institutional Evidence (Legacy or Unlinked)\n';
        unlinkedArts.forEach(a => {
            artefactsSection += `- [${a.type}] ${a.ref}${a.name && a.name !== a.ref ? ` — ${a.name}` : ''}\n`;
        });
    }

    return `
# AI Governance Profile: ${orgName}
Date: ${record.date_created}
Mode: ${modeName}

> **Self-Assessment Notice & Disclaimer**: This assessment record represents internal self-reported practices and institutional reflection across seven governance dimensions. It is intended for capability development and strategic prioritization, not as external regulatory compliance certification or statutory legal assurance.

## Governance Profile Summary
- **Governance Readiness Index**: ${profile.readinessIndex}%
- **Overall State**: ${profile.overallMaturity}
- **Strong Areas**: ${profile.strong.join(', ') || 'None'}
- **Developing Areas**: ${profile.developing.join(', ') || 'None'}
- **Areas to Strengthen**: ${profile.weak.join(', ') || 'None'}

${profile.comparison ? `## Comparison with Previous (${profile.comparison.previousDate})
- **Overall Shift**: ${profile.comparison.overallChange >= 0 ? '+' : ''}${profile.comparison.overallChange}%
` : ''}

## Dimension Breakdown & Maturity Scores
| Dimension | Score | Maturity Level | Qualitative Notes | Linked Evidence |
| :--- | :---: | :--- | :--- | :--- |
${tableRows}

## Strategic Recommended Actions (Gap-to-Action)
${profile.gapActions.length > 0 ? profile.gapActions.map(a => `- **[${a.priority}]** ${a.action}`).join('\n') : '- No immediate gap-based actions required.'}

## Directions for Strategic Improvement
${profile.improvementDirections.length > 0 ? profile.improvementDirections.map(d => `- ${d}`).join('\n') : '- No improvement directions generated.'}

## Key Reflection Prompts (${modeName} Mode)
${profile.reflectionPrompts.map(p => `- ${p}`).join('\n')}

## Interpreted Patterns
${profile.patterns.length > 0 ? profile.patterns.map(p => `### ${p.name}\n${p.implication}`).join('\n\n') : 'No divergent patterns detected.'}

## Governance Fragility Signals
${profile.fragilitySignals.length > 0 ? profile.fragilitySignals.map(s => `- ⚠ ${s}`).join('\n') : '- No immediate fragility signals detected.'}

## Evidence & Artefacts Portfolio
${artefactsSection.trim()}

${record.capabilityNotes || record.governanceNotes ? `## Institutional Capability & Governance Notes
${record.capabilityNotes ? `### Capability Development\n${record.capabilityNotes}\n` : ''}
${record.governanceNotes ? `### Governance & Rationale\n${record.governanceNotes}\n` : ''}
` : ''}

---
*Generated by CloudPedagogy AI Governance Maturity Assessment (CDD-Driven)*
    `.trim();
}

