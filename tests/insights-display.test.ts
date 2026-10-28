import { describe, it, expect, beforeEach } from 'vitest';
import { AssessmentUI } from '../src/components/AssessmentUI';
import schemaData from '../MATURITY_SCHEMA.json';
import type { Schema } from '../src/types';

describe('B2.1: Calculated Insights and Reflection Prompts Display', () => {
    const schema = schemaData as Schema;
    let container: HTMLElement;

    beforeEach(() => {
        window.localStorage.clear();
        container = document.createElement('div');
        document.body.innerHTML = '';
        document.body.appendChild(container);
    });

    it('renders improvement directions and reflection prompts on results screen in individual mode', () => {
        const ui = new AssessmentUI(schema, container);
        const record = (ui as any).currentRecord;
        record.organisation_name = 'Alpha Health';
        record.team_mode = false;
        record.scores = {
            traceability: 0,
            accountability: 1,
            review_practices: 2,
            learning_capability: 3
        };

        // Go to results screen
        (ui as any).currentDimensionIndex = schema.dimensions.length;
        ui.render();

        // 1. Check Directions for Strategic Improvement card and content
        expect(container.textContent).toContain('Directions for Strategic Improvement');
        const improvementItems = container.querySelectorAll('.improvement-item');
        expect(improvementItems.length).toBeGreaterThan(0);
        // Traceability (score 0) direction should be present
        expect(container.textContent).toContain('Establishing standard logging and audit trails for AI tool usage');
        // Accountability (score 1) direction should be present
        expect(container.textContent).toContain('Clarifying accountability roles, formal governance ownership');

        // 2. Check Reflection Prompts card and title for individual reflection mode
        expect(container.textContent).toContain('Key Individual Reflection Prompts');
        expect(container.textContent).toContain('Inquiry prompts for individual practitioners');
        expect(container.textContent).toContain('Where am I relying on individual competence rather than formal systems?');

        // 3. Check disclaimer notice
        expect(container.textContent).toContain('Self-Assessment Notice & Governance Scope:');
        expect(container.textContent).toContain('not external regulatory certification or statutory compliance verification');
    });

    it('renders team discussion prompts appropriately when team mode is enabled', () => {
        const ui = new AssessmentUI(schema, container);
        const record = (ui as any).currentRecord;
        record.organisation_name = 'Beta University';
        record.team_mode = true;
        record.scores = {
            traceability: 2,
            boundary_clarity: 2,
            risk_management: 2,
            accountability: 2,
            policy_alignment: 2,
            review_practices: 2,
            learning_capability: 2
        };

        (ui as any).currentDimensionIndex = schema.dimensions.length;
        ui.render();

        expect(container.textContent).toContain('Key Team Discussion Prompts');
        expect(container.textContent).toContain('Facilitation questions designed for cross-functional governance review sessions');
        expect(container.textContent).toContain('Where is our team relying on individual heroics rather than governance systems?');
    });

    it('handles empty results and unscored dimensions meaningfully without runtime errors', () => {
        const ui = new AssessmentUI(schema, container);
        const record = (ui as any).currentRecord;
        record.organisation_name = 'Empty Org';
        record.scores = {}; // completely empty

        (ui as any).currentDimensionIndex = schema.dimensions.length;
        ui.render();

        expect(container.textContent).toContain('Governance Readiness Index');
        expect(container.textContent).toContain('0%');
        expect(container.textContent).toContain('Complete assessment questions to generate targeted governance improvement directions.');
        expect(container.textContent).toContain('No immediate gap-based actions identified.');
    });
});
