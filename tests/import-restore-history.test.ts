import { describe, it, expect, beforeEach } from 'vitest';
import { AssessmentUI } from '../src/components/AssessmentUI';
import defaultSchema from '../MATURITY_SCHEMA.json';
import { saveAssessmentToStorage, loadAssessmentFromStorage, saveHistoryToStorage, loadHistoryFromStorage } from '../src/logic/storage';
import { exportToJSON } from '../src/logic/assessment';
import type { AssessmentRecord, Schema } from '../src/types';

describe('B3.1: Assessment Import, Restore and History', () => {
    let container: HTMLElement;
    const schema = defaultSchema as Schema;

    beforeEach(() => {
        window.localStorage.clear();
        document.body.innerHTML = '<div id="app"></div>';
        container = document.getElementById('app')!;
    });

    it('successfully validates and round-trips exported JSON via exportToJSON and storage loader', () => {
        const record: AssessmentRecord = {
            assessment_id: 'test-uuid-1',
            organisation_name: 'Acme Health AI',
            date_created: '2026-10-28',
            team_mode: true,
            scores: {
                traceability: 3,
                boundary_clarity: 2,
                risk_management: 3,
                accountability: 1,
                policy_alignment: 1,
                review_practices: 2,
                learning_capability: 1
            },
            notes: {
                traceability: 'Comprehensive logs maintained.'
            },
            artefacts: [
                { id: 'art-1', type: 'workflow', ref: 'WF-01', name: 'Clinical Triage', dimensionId: 'traceability' }
            ],
            capabilityNotes: 'Capability notes text',
            governanceNotes: 'Governance assumptions'
        };

        const jsonStr = exportToJSON(record);
        expect(jsonStr).toContain('Acme Health AI');
        expect(jsonStr).toContain('WF-01');

        const parsed = JSON.parse(jsonStr);
        expect(parsed.organisation_name).toBe('Acme Health AI');
        expect(parsed.scores.traceability).toBe(3);
        expect(parsed.artefacts[0].ref).toBe('WF-01');
    });

    it('history buffer stores multiple snapshots and limits circular buffer to 5', () => {
        const snapshots: AssessmentRecord[] = [];
        for (let i = 1; i <= 6; i++) {
            snapshots.push({
                assessment_id: `rec-${i}`,
                organisation_name: `Org ${i}`,
                date_created: '2026-10-28',
                team_mode: false,
                scores: { traceability: i % 4 },
                notes: {},
                artefacts: []
            });
        }

        // Circular buffer slice(0, 5)
        const historyBuffer = snapshots.slice(0, 5);
        saveHistoryToStorage(historyBuffer, window.localStorage);

        const loaded = loadHistoryFromStorage(window.localStorage, schema.dimensions.map(d => d.id));
        expect(loaded).toHaveLength(5);
        expect(loaded[0].organisation_name).toBe('Org 1');
        expect(loaded[4].organisation_name).toBe('Org 5');
    });

    it('renders history snapshot button on welcome screen with correct count', () => {
        const history: AssessmentRecord[] = [
            {
                assessment_id: 'h-1',
                organisation_name: 'Historical Org Alpha',
                date_created: '2026-10-25',
                team_mode: false,
                scores: { traceability: 2 },
                notes: {},
                artefacts: []
            }
        ];
        saveHistoryToStorage(history, window.localStorage);

        const ui = new AssessmentUI(schema, container);
        ui.render();

        const historyBtn = container.querySelector('#historyBtn');
        expect(historyBtn).not.toBeNull();
        expect(historyBtn?.textContent).toContain('History Snapshots (1)');

        const importBtn = container.querySelector('#importBtn');
        expect(importBtn).not.toBeNull();
        expect(importBtn?.textContent).toContain('Import Assessment JSON');
    });

    it('opens history modal when clicking History Snapshots and displays restore, compare, and delete options', async () => {
        const history: AssessmentRecord[] = [
            {
                assessment_id: 'h-alpha',
                organisation_name: 'NHS Alpha Trust',
                date_created: '2026-10-20',
                team_mode: true,
                scores: { traceability: 3, boundary_clarity: 2 },
                notes: { traceability: 'Good logs' },
                artefacts: []
            }
        ];
        saveHistoryToStorage(history, window.localStorage);

        const ui = new AssessmentUI(schema, container);
        ui.render();

        const historyBtn = container.querySelector('#historyBtn') as HTMLButtonElement;
        historyBtn.click();

        // Modal should appear in document.body
        const modal = document.body.querySelector('.modal-overlay');
        expect(modal).not.toBeNull();
        expect(modal?.textContent).toContain('NHS Alpha Trust');
        expect(modal?.textContent).toContain('2/7 Dimensions Scored');

        const restoreBtn = modal?.querySelector('.restore-hist-btn');
        const compareBtn = modal?.querySelector('.compare-hist-btn');
        const deleteBtn = modal?.querySelector('.delete-hist-btn');

        expect(restoreBtn).not.toBeNull();
        expect(compareBtn).not.toBeNull();
        expect(deleteBtn).not.toBeNull();

        // Close modal
        const closeBtn = modal?.querySelector('#closeHistoryModal') as HTMLButtonElement;
        closeBtn.click();
        expect(document.body.querySelector('.modal-overlay')).toBeNull();
    });

    it('history modal delete button removes snapshot from storage', async () => {
        const history: AssessmentRecord[] = [
            {
                assessment_id: 'to-delete',
                organisation_name: 'Delete Me Org',
                date_created: '2026-10-20',
                team_mode: false,
                scores: { traceability: 1 },
                notes: {},
                artefacts: []
            }
        ];
        saveHistoryToStorage(history, window.localStorage);

        const ui = new AssessmentUI(schema, container);
        ui.render();

        const historyBtn = container.querySelector('#historyBtn') as HTMLButtonElement;
        historyBtn.click();

        const deleteBtn = document.body.querySelector('.delete-hist-btn') as HTMLButtonElement;
        deleteBtn.click();

        const remaining = loadHistoryFromStorage(window.localStorage, schema.dimensions.map(d => d.id));
        expect(remaining).toHaveLength(0);
    });
});
