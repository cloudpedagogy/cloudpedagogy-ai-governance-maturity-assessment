import { describe, it, expect, beforeEach } from 'vitest';
import { AssessmentUI } from '../src/components/AssessmentUI';
import schemaData from '../MATURITY_SCHEMA.json';
import type { Schema } from '../src/types';
import { STORAGE_KEYS } from '../src/logic/storage';

describe('B1.2: Notes and State Persistence', () => {
    let container: HTMLElement;
    const schema = schemaData as Schema;

    beforeEach(() => {
        window.localStorage.clear();
        container = document.createElement('div');
        document.body.innerHTML = '';
        document.body.appendChild(container);
    });

    it('preserves reflective notes when navigating forward to next dimension and then backward to previous', () => {
        const ui = new AssessmentUI(schema, container);
        ui.render();

        // 1. On Welcome screen, start assessment
        const startBtn = container.querySelector('#startBtn') as HTMLButtonElement;
        expect(startBtn).toBeTruthy();
        startBtn.click();

        // 2. Now on Dimension 1 (index 0)
        expect(container.querySelector('.dimension-title')?.textContent).toContain(schema.dimensions[0].name);

        // Select a score for Dimension 1
        const radio1 = container.querySelector('#level-2') as HTMLInputElement;
        expect(radio1).toBeTruthy();
        radio1.checked = true;
        radio1.dispatchEvent(new Event('change', { bubbles: true }));

        // Enter reflective notes for Dimension 1
        const notesArea = container.querySelector('#notes') as HTMLTextAreaElement;
        expect(notesArea).toBeTruthy();
        notesArea.value = 'Detailed qualitative notes regarding Dimension 1 governance.';
        notesArea.dispatchEvent(new Event('input', { bubbles: true }));

        // 3. Click Next Dimension
        const nextBtn = container.querySelector('#nextBtn') as HTMLButtonElement;
        nextBtn.click();

        // 4. Now on Dimension 2 (index 1)
        expect(container.querySelector('.dimension-title')?.textContent).toContain(schema.dimensions[1].name);

        // Enter reflective notes for Dimension 2
        const notesArea2 = container.querySelector('#notes') as HTMLTextAreaElement;
        notesArea2.value = 'Work in progress notes for Dimension 2 before going back.';
        notesArea2.dispatchEvent(new Event('input', { bubbles: true }));

        // 5. Click Previous button
        const prevBtn = container.querySelector('#prevBtn') as HTMLButtonElement;
        prevBtn.click();

        // 6. Should be back on Dimension 1, with Dimension 1 notes intact!
        expect(container.querySelector('.dimension-title')?.textContent).toContain(schema.dimensions[0].name);
        const restoredNotesArea1 = container.querySelector('#notes') as HTMLTextAreaElement;
        expect(restoredNotesArea1.value).toBe('Detailed qualitative notes regarding Dimension 1 governance.');

        // 7. Click Next again to return to Dimension 2
        const nextBtnAgain = container.querySelector('#nextBtn') as HTMLButtonElement;
        nextBtnAgain.click();

        // Dimension 2 notes should also have been saved when Previous was clicked!
        expect(container.querySelector('.dimension-title')?.textContent).toContain(schema.dimensions[1].name);
        const restoredNotesArea2 = container.querySelector('#notes') as HTMLTextAreaElement;
        expect(restoredNotesArea2.value).toBe('Work in progress notes for Dimension 2 before going back.');
    });

    it('persists notes immediately on keystroke without requiring Next or Previous clicks', () => {
        const ui = new AssessmentUI(schema, container);
        ui.render();

        const startBtn = container.querySelector('#startBtn') as HTMLButtonElement;
        startBtn.click();

        const notesArea = container.querySelector('#notes') as HTMLTextAreaElement;
        notesArea.value = 'Auto-saved mid-sentence reflection';
        notesArea.dispatchEvent(new Event('input', { bubbles: true }));

        // Verify storage was updated immediately
        const storedJson = window.localStorage.getItem(STORAGE_KEYS.CURRENT_V1);
        expect(storedJson).toBeTruthy();
        const storedRecord = JSON.parse(storedJson!);
        expect(storedRecord.notes[schema.dimensions[0].id]).toBe('Auto-saved mid-sentence reflection');
    });

    it('restores in-progress assessment and notes after page refresh / re-instantiation', () => {
        // First session
        const ui1 = new AssessmentUI(schema, container);
        ui1.render();

        const orgInput = container.querySelector('#orgName') as HTMLInputElement;
        orgInput.value = 'St. Jude Health';
        orgInput.dispatchEvent(new Event('input', { bubbles: true }));

        const startBtn = container.querySelector('#startBtn') as HTMLButtonElement;
        startBtn.click();

        // Score dimension 1
        const radio = container.querySelector('#level-3') as HTMLInputElement;
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));

        // Enter notes
        const notes = container.querySelector('#notes') as HTMLTextAreaElement;
        notes.value = 'Preserved across browser reloads';
        notes.dispatchEvent(new Event('input', { bubbles: true }));

        // Simulate page reload by creating a new UI instance in a new container
        const newContainer = document.createElement('div');
        const ui2 = new AssessmentUI(schema, newContainer);
        ui2.render();

        // Welcome screen should show Continue Assessment
        expect(newContainer.querySelector('#startBtn')?.textContent).toBe('Continue Assessment');
        expect((newContainer.querySelector('#orgName') as HTMLInputElement).value).toBe('St. Jude Health');

        // Click Continue
        (newContainer.querySelector('#startBtn') as HTMLButtonElement).click();

        // Should resume at first unanswered dimension (Dimension 2, index 1)
        expect(newContainer.querySelector('.dimension-title')?.textContent).toContain(schema.dimensions[1].name);

        // Click Previous to check Dimension 1
        (newContainer.querySelector('#prevBtn') as HTMLButtonElement).click();
        expect((newContainer.querySelector('#notes') as HTMLTextAreaElement).value).toBe('Preserved across browser reloads');
        expect((newContainer.querySelector('#level-3') as HTMLInputElement).checked).toBe(true);
    });

    it('persists answer updates when a user revisits an earlier dimension and changes a score', () => {
        const ui = new AssessmentUI(schema, container);
        ui.render();

        (container.querySelector('#startBtn') as HTMLButtonElement).click();

        // Select score 1 for Dimension 1
        const radio1 = container.querySelector('#level-1') as HTMLInputElement;
        radio1.checked = true;
        radio1.dispatchEvent(new Event('change', { bubbles: true }));

        (container.querySelector('#nextBtn') as HTMLButtonElement).click();

        // Now on Dimension 2, go back to Dimension 1
        (container.querySelector('#prevBtn') as HTMLButtonElement).click();

        // Change score from 1 to 3
        const radio3 = container.querySelector('#level-3') as HTMLInputElement;
        radio3.checked = true;
        radio3.dispatchEvent(new Event('change', { bubbles: true }));

        // Verify storage reflects score 3
        const storedJson = window.localStorage.getItem(STORAGE_KEYS.CURRENT_V1);
        const storedRecord = JSON.parse(storedJson!);
        expect(storedRecord.scores[schema.dimensions[0].id]).toBe(3);
    });
});
