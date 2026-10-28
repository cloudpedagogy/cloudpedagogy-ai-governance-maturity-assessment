import { describe, it, expect, beforeEach } from 'vitest';
import { AssessmentUI } from '../src/components/AssessmentUI';
import defaultSchema from '../MATURITY_SCHEMA.json';
import { saveAssessmentToStorage, loadAssessmentFromStorage } from '../src/logic/storage';
import type { AssessmentRecord, Schema } from '../src/types';

describe('B3.2: Dimension Stepper Navigation and Assessment Review', () => {
    let container: HTMLElement;
    const schema = defaultSchema as Schema;

    beforeEach(() => {
        window.localStorage.clear();
        document.body.innerHTML = '<div id="app"></div>';
        container = document.getElementById('app')!;
    });

    it('renders stepper navigation with all 7 dimensions and accessibility attributes', () => {
        const ui = new AssessmentUI(schema, container);
        ui.render();

        // Start assessment
        const orgInput = container.querySelector('#orgName') as HTMLInputElement;
        orgInput.value = 'Test Stepper Org';
        const startBtn = container.querySelector('#startBtn') as HTMLButtonElement;
        startBtn.click();

        const stepper = container.querySelector('.stepper-nav');
        expect(stepper).not.toBeNull();
        expect(stepper?.getAttribute('aria-label')).toBe('Governance dimensions stepper');

        const steps = container.querySelectorAll('.stepper-step');
        expect(steps).toHaveLength(7);

        // First step should be active
        expect(steps[0].classList.contains('active')).toBe(true);
        expect(steps[0].getAttribute('aria-selected')).toBe('true');
        expect(steps[0].textContent).toContain('Decision Traceability');

        // Other steps should be unanswered and not active
        expect(steps[1].classList.contains('active')).toBe(false);
        expect(steps[1].classList.contains('unanswered')).toBe(true);
    });

    it('accurately displays answered status badge when dimension is scored', () => {
        const record: AssessmentRecord = {
            assessment_id: 'stepper-rec',
            organisation_name: 'Stepper Test Org',
            date_created: '2026-10-28',
            team_mode: false,
            scores: {
                traceability: 2,
                boundary_clarity: 1
            },
            notes: {},
            artefacts: []
        };
        saveAssessmentToStorage(record, window.localStorage);

        const ui = new AssessmentUI(schema, container);
        ui.render();

        // Continue assessment
        const startBtn = container.querySelector('#startBtn') as HTMLButtonElement;
        startBtn.click();

        const steps = container.querySelectorAll('.stepper-step');
        // Steps 0 and 1 should have answered badge '✓'
        expect(steps[0].classList.contains('answered')).toBe(true);
        expect(steps[0].querySelector('.step-badge')?.textContent).toBe('✓');

        expect(steps[1].classList.contains('answered')).toBe(true);
        expect(steps[1].querySelector('.step-badge')?.textContent).toBe('✓');

        // Step 2 should be unanswered with number '3'
        expect(steps[2].classList.contains('unanswered')).toBe(true);
        expect(steps[2].querySelector('.step-badge')?.textContent).toBe('3');
    });

    it('auto-saves notes when jumping directly to another dimension via stepper without validation error', () => {
        const ui = new AssessmentUI(schema, container);
        ui.render();

        // Start assessment
        const orgInput = container.querySelector('#orgName') as HTMLInputElement;
        orgInput.value = 'AutoSave Stepper Org';
        const startBtn = container.querySelector('#startBtn') as HTMLButtonElement;
        startBtn.click();

        // We are on Dimension 0 (traceability)
        const notesArea = container.querySelector('#notes') as HTMLTextAreaElement;
        notesArea.value = 'Draft notes typed by assessor before jumping';

        // Select score 2
        const radio2 = container.querySelector('input[id="level-2"]') as HTMLInputElement;
        radio2.click();

        // Directly jump to Dimension 3 (accountability) via stepper button
        const step3 = container.querySelector('.stepper-step[data-index="3"]') as HTMLButtonElement;
        step3.click();

        // Verify we navigated to Dimension 4 (accountability) without any modal dialog blocking
        expect(document.body.querySelector('.modal-overlay')).toBeNull();
        expect(container.querySelector('.dimension-title')?.textContent).toContain('Oversight & Accountability');

        // Verify that notes and score for Dimension 0 were persisted in storage
        const saved = loadAssessmentFromStorage(window.localStorage, schema.dimensions.map(d => d.id));
        expect(saved?.scores.traceability).toBe(2);
        expect(saved?.notes.traceability).toBe('Draft notes typed by assessor before jumping');
    });

    it('allows jumping back to revisit previously answered dimensions directly', () => {
        const record: AssessmentRecord = {
            assessment_id: 'stepper-revisit',
            organisation_name: 'Revisit Org',
            date_created: '2026-10-28',
            team_mode: false,
            scores: {
                traceability: 3,
                boundary_clarity: 2,
                risk_management: 1
            },
            notes: {
                traceability: 'Original traceability notes'
            },
            artefacts: []
        };
        saveAssessmentToStorage(record, window.localStorage);

        const ui = new AssessmentUI(schema, container);
        ui.render();

        const startBtn = container.querySelector('#startBtn') as HTMLButtonElement;
        startBtn.click();

        // Currently at first incomplete dimension (accountability, idx 3)
        expect(container.querySelector('.dimension-title')?.textContent).toContain('Oversight & Accountability');

        // Click on step 0 (traceability) to revisit
        const step0 = container.querySelector('.stepper-step[data-index="0"]') as HTMLButtonElement;
        step0.click();

        // Now on Dimension 0
        expect(container.querySelector('.dimension-title')?.textContent).toContain('Decision Traceability');
        const notesArea = container.querySelector('#notes') as HTMLTextAreaElement;
        expect(notesArea.value).toBe('Original traceability notes');
        const radio3 = container.querySelector('input[id="level-3"]') as HTMLInputElement;
        expect(radio3.checked).toBe(true);
    });
});
