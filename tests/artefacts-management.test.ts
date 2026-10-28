import { describe, it, expect, beforeEach } from 'vitest';
import { AssessmentUI } from '../src/components/AssessmentUI';
import { normalizeAssessmentRecord, loadAssessmentFromStorage, saveAssessmentToStorage } from '../src/logic/storage';
import schemaData from '../MATURITY_SCHEMA.json';
import type { Schema } from '../src/types';

describe('B2.4: Artefact and Evidence Management', () => {
    const schema = schemaData as Schema;
    let container: HTMLElement;

    beforeEach(() => {
        window.localStorage.clear();
        container = document.createElement('div');
        document.body.innerHTML = '';
        document.body.appendChild(container);
    });

    it('attaches evidence with selected category, reference, and dimensionId', () => {
        const ui = new AssessmentUI(schema, container);
        (ui as any).currentDimensionIndex = 0; // Traceability dimension
        ui.render();

        const typeSelect = container.querySelector('#artefactType') as HTMLSelectElement;
        const refInput = container.querySelector('#artefactRef') as HTMLInputElement;
        const nameInput = container.querySelector('#artefactName') as HTMLInputElement;
        const addBtn = container.querySelector('#addArtefact') as HTMLButtonElement;

        expect(typeSelect).not.toBeNull();
        expect(refInput).not.toBeNull();
        expect(addBtn).not.toBeNull();

        typeSelect.value = 'document';
        refInput.value = 'DOC-TRACE-01';
        nameInput.value = 'Data Provenance Charter';
        addBtn.click();

        // Check in currentRecord
        const artefacts = (ui as any).currentRecord.artefacts;
        expect(artefacts.length).toBe(1);
        expect(artefacts[0].type).toBe('document');
        expect(artefacts[0].ref).toBe('DOC-TRACE-01');
        expect(artefacts[0].name).toBe('Data Provenance Charter');
        expect(artefacts[0].dimensionId).toBe('traceability');
        expect(artefacts[0].id).toBeDefined();

        // Verify rendered in UI
        expect(container.textContent).toContain('DOC-TRACE-01');
        expect(container.textContent).toContain('Data Provenance Charter');
    });

    it('isolates evidence to its relevant dimension and does not display on other dimensions', () => {
        const ui = new AssessmentUI(schema, container);
        const record = (ui as any).currentRecord;
        record.artefacts = [
            {
                id: 'art-1',
                type: 'workflow',
                ref: 'WF-TRACE-99',
                name: 'Traceability Flow',
                dimensionId: 'traceability'
            },
            {
                id: 'art-2',
                type: 'decision',
                ref: 'DEC-RISK-42',
                name: 'Risk Decision Log',
                dimensionId: 'risk_management'
            }
        ];

        // Navigate to dimension 0: Decision Traceability
        (ui as any).currentDimensionIndex = 0;
        ui.render();

        expect(container.textContent).toContain('WF-TRACE-99');
        expect(container.textContent).not.toContain('DEC-RISK-42');

        // Navigate to dimension 2: Risk Awareness & Management
        (ui as any).currentDimensionIndex = 2;
        ui.render();

        expect(container.textContent).toContain('DEC-RISK-42');
        expect(container.textContent).not.toContain('WF-TRACE-99');
    });

    it('allows users to delete erroneous evidence items and updates storage', () => {
        const ui = new AssessmentUI(schema, container);
        const record = (ui as any).currentRecord;
        record.artefacts = [
            {
                id: 'art-to-keep',
                type: 'workflow',
                ref: 'KEEP-001',
                name: 'Keep Me',
                dimensionId: 'traceability'
            },
            {
                id: 'art-to-delete',
                type: 'document',
                ref: 'WRONG-002',
                name: 'Delete Me',
                dimensionId: 'traceability'
            }
        ];

        (ui as any).currentDimensionIndex = 0;
        ui.render();

        expect(container.textContent).toContain('KEEP-001');
        expect(container.textContent).toContain('WRONG-002');

        // Click delete button for WRONG-002
        const deleteBtn = container.querySelector('button.pill-delete[data-id="art-to-delete"]') as HTMLButtonElement;
        expect(deleteBtn).not.toBeNull();
        deleteBtn.click();

        // Verify removed from record
        expect((ui as any).currentRecord.artefacts.length).toBe(1);
        expect((ui as any).currentRecord.artefacts[0].ref).toBe('KEEP-001');

        // Verify removed from DOM
        expect(container.textContent).toContain('KEEP-001');
        expect(container.textContent).not.toContain('WRONG-002');

        // Verify persisted to storage
        const loaded = loadAssessmentFromStorage(window.localStorage);
        expect(loaded?.artefacts.length).toBe(1);
        expect(loaded?.artefacts[0].ref).toBe('KEEP-001');
    });

    it('preserves legacy unlinked artefacts and groups them cleanly in results portfolio', () => {
        // Pre-populate storage with legacy unlinked artefacts (no dimensionId)
        const legacyData = {
            assessment_id: 'legacy-rec-1',
            organisation_name: 'Legacy Heritage Trust',
            date_created: '2026-01-01',
            team_mode: false,
            scores: { traceability: 2 },
            notes: {},
            artefacts: [
                { type: 'workflow', ref: 'LEGACY-WF-10', name: 'Legacy Pipeline' },
                { type: 'decision', ref: 'LEGACY-DEC-20', name: 'Legacy Oversight Record' }
            ]
        };

        saveAssessmentToStorage(legacyData as any);

        const ui = new AssessmentUI(schema, container);
        (ui as any).currentDimensionIndex = schema.dimensions.length; // Results screen
        ui.render();

        expect(container.textContent).toContain('Evidence & Artefacts Portfolio');
        expect(container.textContent).toContain('General / Institutional Evidence (Legacy or Unlinked)');
        expect(container.textContent).toContain('LEGACY-WF-10');
        expect(container.textContent).toContain('LEGACY-DEC-20');
    });

    it('normalizes raw artefact records with fallback IDs and safe types', () => {
        const raw = {
            assessment_id: 'raw-1',
            organisation_name: 'Raw Test',
            artefacts: [
                { type: 'decision', ref: 'DEC-01', name: 'Valid Decision', dimensionId: 'boundary_clarity' },
                { type: 'unknown_type', ref: 'REF-02' }, // should fallback to workflow
                { invalid: true } // should handle missing fields safely
            ]
        };

        const normalized = normalizeAssessmentRecord(raw);
        expect(normalized).not.toBeNull();
        expect(normalized?.artefacts.length).toBe(3);
        expect(normalized?.artefacts[0].type).toBe('decision');
        expect(normalized?.artefacts[0].dimensionId).toBe('boundary_clarity');
        expect(normalized?.artefacts[1].type).toBe('workflow');
        expect(normalized?.artefacts[1].ref).toBe('REF-02');
        expect(normalized?.artefacts[2].ref).toBe('');
    });
});
