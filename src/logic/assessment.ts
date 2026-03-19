import type { AssessmentRecord, Schema, GovernanceProfile } from '../types';

export function calculateGovernanceProfile(schema: Schema, record: AssessmentRecord): GovernanceProfile {
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

    // Pattern Detection Logic
    const score = (id: string) => record.scores[id] || 0;

    // 1. Strong practice but weak oversight
    if ((score('traceability') >= 2 || score('boundary_clarity') >= 2) && score('accountability') <= 1) {
        patterns.push({
            name: "Strong Applied Practice, Weak Oversight",
            implication: "Indicates fragile scaling where good local habits aren't yet institutionalised."
        });
        fragilitySignals.push("Accountability roles are unclear or distributed too thinly.");
    }

    // 2. High AI usage/reliance with low review capability
    if (score('risk_management') >= 2 && score('review_practices') <= 1) {
        patterns.push({
            name: "High Reliance, Low Reflection",
            implication: "Serious risk of unmonitored decision-making and automated bias accumulation."
        });
        fragilitySignals.push("Review cycles are informal or non-existent for high-impact systems.");
    }

    // 3. Clear awareness but weak institutionalisation
    if (score('risk_management') >= 2 && (score('policy_alignment') <= 1 || score('accountability') <= 1)) {
        patterns.push({
            name: "High Awareness, Low Institutionalisation",
            implication: "Governance depends on individual competence rather than systemic alignment."
        });
        fragilitySignals.push("Internal practices are not consistently mapped to formal policy.");
    }

    // 4. Static Governance (Low learning)
    if (score('policy_alignment') >= 2 && score('learning_capability') <= 1) {
        patterns.push({
            name: "Compliance-First, Learning-Slow",
            implication: "The organization may follow rules but fails to adapt to new AI risks."
        });
        fragilitySignals.push("Lack of post-deployment feedback loops into governance design.");
    }

    // Improvement Directions
    const improvementDirections: string[] = [];
    if (weak.length > 0) {
        if (record.scores['accountability'] <= 1) improvementDirections.push("Clarifying accountability roles and central oversight.");
        if (record.scores['review_practices'] <= 1) improvementDirections.push("Formalising periodic review cycles for AI-supported workflows.");
        if (record.scores['learning_capability'] <= 1) improvementDirections.push("Embedding governance updates into institutional learning loops.");
    } else {
        improvementDirections.push("Continuing to stress-test governance under increased AI scale.");
        improvementDirections.push("Sharing internal governance patterns with external partners.");
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

    return {
        overallMaturity,
        strong,
        developing,
        weak,
        patterns,
        fragilitySignals,
        improvementDirections,
        reflectionPrompts: prompts
    };
}

export function exportToJSON(record: AssessmentRecord) {
    return JSON.stringify(record, null, 2);
}

export function exportToMarkdown(record: AssessmentRecord, profile: GovernanceProfile): string {
    return `
# AI Governance Profile: ${record.organisation_name}
Date: ${record.date_created}
Mode: ${record.team_mode ? 'Team Discussion' : 'Individual Reflection'}

## Governance Profile Summary
- **Overall State**: ${profile.overallMaturity}
- **Strong Areas**: ${profile.strong.join(', ') || 'None'}
- **Developing Areas**: ${profile.developing.join(', ') || 'None'}
- **Areas to Strengthen**: ${profile.weak.join(', ') || 'None'}

## Interpreted Patterns
${profile.patterns.map(p => `### ${p.name}\n${p.implication}`).join('\n\n')}

## Fragility Signals
${profile.fragilitySignals.map(s => `- ⚠ ${s}`).join('\n')}

## Directions for Improvement
${profile.improvementDirections.map(d => `- ${d}`).join('\n')}

## Reflection Prompts
${profile.reflectionPrompts.map(p => `- ${p}`).join('\n')}

---
*Generated by CloudPedagogy AI Governance Maturity Assessment (CDD-Driven)*
    `.trim();
}
