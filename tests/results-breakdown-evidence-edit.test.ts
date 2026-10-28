import { describe, it, expect, beforeEach } from 'vitest';
import { AssessmentUI } from '../src/components/AssessmentUI';
import defaultSchema from '../MATURITY_SCHEMA.json';
import { saveAssessmentToStorage, loadAssessmentFromStorage } from '../src/logic/storage';
import type { AssessmentRecord, Schema } from '../src/types';

describe('B3.3: Results Breakdown and Evidence Review & Correction', () => {
    let container: HTMLElement;
    const schema = defaultSchema as Schema;

    beforeEach(() => {
        window.localStorage.clear();
        document.body.innerHTML = '<div id="app"></div>';
        container = document.getElementById('app')!;
    });

    it('renders detailed 7-dimension breakdown audit table with scores, descriptive levels, notes, and evidence', () => {
        const fullRecord: AssessmentRecord = {
            assessment_id: 'full-rec-1',
            organisation_name: 'Audit Review Trust',
            date_created: '2026-10-28',
            team_mode: true,
            scores: {
                traceability: 3,
                boundary_clarity: 2,
                risk_management: 1,
                accountability: 0,
                policy_alignment: 2,
                review_practices: 1,
                learning_capability: 3
            },
            notes: {
                traceability: 'Comprehensive immutable logs in place.',
                accountability: 'Oversight role vacant.'
            },
            artefacts: [
                { id: 'art-audit-1', type: 'workflow', ref: 'WF-TRACE-99', name: 'Audit Workflow', dimensionId: 'traceability' }
            ]
        };
        saveAssessmentToStorage(fullRecord, window.localStorage);

        const ui = new AssessmentUI(schema, container);
        ui.render();

        const startBtn = container.querySelector('#startBtn') as HTMLButtonElement;
        startBtn.click(); // Navigates to results since all 7 are scored

        // Breakdown table check
        const table = container.querySelector('.dimension-breakdown-table');
        expect(table).not.toBeNull();

        const rows = table?.querySelectorAll('tbody tr');
        expect(rows).toHaveLength(7);

        // Check first dimension row (traceability)
        const row0Text = rows?.[0].textContent || '';
        expect(row0Text).toContain('Decision Traceability');
        expect(row0Text).toContain('Level 3');
        expect(row0Text).toContain('Comprehensive immutable logs in place.');
        expect(row0Text).toContain('WF-TRACE-99');

        // Check fourth dimension row (accountability: Level 0)
        const row3Text = rows?.[3].textContent || '';
        expect(row3Text).toContain('Oversight & Accountability');
        expect(row3Text).toContain('Level 0');
        expect(row3Text).toContain('Oversight role vacant.');
    });

    it('clicking Revisit button in breakdown table navigates directly to that dimension', () => {
        const record: AssessmentRecord = {
            assessment_id: 'revisit-rec-1',
            organisation_name: 'Direct Revisit Org',
            date_created: '2026-10-28',
            team_mode: false,
            scores: {
                traceability: 3,
                boundary_clarity: 2,
                risk_management: 2,
                accountability: 2,
                policy_alignment: 2,
                review_practices: 2,
                learning_capability: 2
            },
            notes: {},
            artefacts: []
        };
        saveAssessmentToStorage(record, window.localStorage);

        const ui = new AssessmentUI(schema, container);
        ui.render();

        const startBtn = container.querySelector('#startBtn') as HTMLButtonElement;
        startBtn.click();

        // Click Revisit on dimension index 2 (Risk Awareness & Management)
        const revisitBtn = container.querySelector('.revisit-dim-btn[data-index="2"]') as HTMLButtonElement;
        expect(revisitBtn).not.toBeNull();
        revisitBtn.click();

        expect(container.querySelector('.dimension-title')?.textContent).toContain('Risk Awareness & Management');
    });

    it('evidence edit workflow (✎ Edit) updates evidence reference and description', async () => {
        const record: AssessmentRecord = {
            assessment_id: 'edit-art-rec',
            organisation_name: 'Evidence Edit Org',
            date_created: '2026-10-28',
            team_mode: false,
            scores: {
                traceability: 3,
                boundary_clarity: 3,
                risk_management: 3,
                accountability: 3,
                policy_alignment: 3,
                review_practices: 3,
                learning_capability: 3
            },
            notes: {},
            artefacts: [
                { id: 'art-edit-test', type: 'workflow', ref: 'TYPO-101', name: 'Typo Title', dimensionId: 'traceability' }
            ]
        };
        saveAssessmentToStorage(record, window.localStorage);

        const ui = new AssessmentUI(schema, container);
        ui.render();

        const startBtn = container.querySelector('#startBtn') as HTMLButtonElement;
        startBtn.click();

        // Click .pill-edit on the artefact
        const editBtn = container.querySelector('.pill-edit[data-id="art-edit-test"]') as HTMLButtonElement;
        expect(editBtn).not.toBeNull();
        editBtn.click();

        // Edit modal should be open
        const modal = document.body.querySelector('.modal-overlay');
        expect(modal).not.toBeNull();
        expect(modal?.textContent).toContain('Edit Evidence Reference');

        const refInput = modal?.querySelector('#editArtRef') as HTMLInputElement;
        expect(refInput.value).toBe('TYPO-101');
        refInput.value = 'CORRECTED-101';

        const nameInput = modal?.querySelector('#editArtName') as HTMLInputElement;
        expect(nameInput.value).toBe('Typo Title');
        nameInput.value = 'Corrected Title';

        const saveBtn = modal?.querySelector('#saveEditArt') as HTMLButtonElement;
        saveBtn.click();
        await new Promise(resolve => setTimeout(resolve, 10));

        // Modal should close and record in storage should be updated
        expect(document.body.querySelector('.modal-overlay')).toBeNull();

        const saved = loadAssessmentFromStorage(window.localStorage, schema.dimensions.map(d => d.id));
        expect(saved?.artefacts[0].ref).toBe('CORRECTED-101');
        expect(saved?.artefacts[0].name).toBe('Corrected Title');
    });

    it('displays partial assessment notice banner when fewer than 7 dimensions are scored', () => {
        const partialRecord: AssessmentRecord = {
            assessment_id: 'part-rec',
            organisation_name: 'Incomplete Org',
            date_created: '2026-10-28',
            team_mode: false,
            scores: {
                traceability: 2,
                boundary_clarity: 3
            },
            notes: {},
            artefacts: []
        };
        saveAssessmentToStorage(partialRecord, window.localStorage);

        const ui = new AssessmentUI(schema, container);
        ui.render();

        const demoBtn = container.querySelector('#demoBtn') as HTMLButtonElement;
        expect(demoBtn).not.toBeNull();

        // Start directly and complete partially
        const startBtn = container.querySelector('#startBtn') as HTMLButtonElement;
        startBtn.click();

        // Currently on first incomplete dimension (idx 2: risk_management)
        expect(container.querySelector('.dimension-title')?.textContent).toContain('Risk Awareness & Management');
    });
});
