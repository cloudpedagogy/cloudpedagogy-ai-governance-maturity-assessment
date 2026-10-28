import { describe, it, expect, beforeEach } from 'vitest';
import { AssessmentUI } from '../src/components/AssessmentUI';
import schemaData from '../MATURITY_SCHEMA.json';
import type { Schema } from '../src/types';

describe('B1.6: Accessible Assessment Scoring Controls and Modals', () => {
    let container: HTMLElement;
    const schema = schemaData as Schema;

    beforeEach(() => {
        window.localStorage.clear();
        container = document.createElement('div');
        document.body.innerHTML = '';
        document.body.appendChild(container);
    });

    it('renders native radio buttons without inline display:none style', () => {
        const ui = new AssessmentUI(schema, container);
        (ui as any).currentDimensionIndex = 0; // Go directly to Dimension 1
        ui.render();

        const radioInputs = container.querySelectorAll<HTMLInputElement>('input[name="maturity-level"]');
        expect(radioInputs).toHaveLength(4);

        radioInputs.forEach(radio => {
            expect(radio.type).toBe('radio');
            // Must NOT have inline style="display: none;"
            expect(radio.getAttribute('style') || '').not.toContain('display: none');
            expect(radio.classList.contains('visually-hidden-radio')).toBe(true);
        });
    });

    it('groups radio controls in a semantic fieldset with a screen-reader accessible legend', () => {
        const ui = new AssessmentUI(schema, container);
        (ui as any).currentDimensionIndex = 0;
        ui.render();

        const fieldset = container.querySelector('fieldset.scoring-fieldset');
        expect(fieldset).toBeTruthy();

        const legend = fieldset?.querySelector('legend.sr-only');
        expect(legend).toBeTruthy();
        expect(legend?.textContent).toContain(schema.dimensions[0].name);

        const radiogroup = container.querySelector('[role="radiogroup"]');
        expect(radiogroup).toBeTruthy();
    });

    it('properly associates labels with inputs using for and id attributes', () => {
        const ui = new AssessmentUI(schema, container);
        (ui as any).currentDimensionIndex = 0;
        ui.render();

        schema.levels.forEach(level => {
            const input = container.querySelector(`#level-${level.id}`) as HTMLInputElement;
            expect(input).toBeTruthy();
            const label = container.querySelector(`label[for="level-${level.id}"]`);
            expect(label).toBeTruthy();
        });
    });

    it('updates aria-checked and visual classes when selecting radio options via change event', () => {
        const ui = new AssessmentUI(schema, container);
        (ui as any).currentDimensionIndex = 0;
        ui.render();

        const radio2 = container.querySelector('#level-2') as HTMLInputElement;
        expect(radio2.getAttribute('aria-checked')).toBe('false');

        // Simulate selection via change event (e.g. keyboard arrow navigation or click)
        radio2.checked = true;
        radio2.dispatchEvent(new Event('change', { bubbles: true }));

        expect(radio2.getAttribute('aria-checked')).toBe('true');
        const label2 = container.querySelector('label[for="level-2"]');
        expect(label2?.classList.contains('selected')).toBe(true);

        // Other options should have aria-checked="false"
        const radio0 = container.querySelector('#level-0') as HTMLInputElement;
        expect(radio0.getAttribute('aria-checked')).toBe('false');
        const label0 = container.querySelector('label[for="level-0"]');
        expect(label0?.classList.contains('selected')).toBe(false);
    });

    it('implements accessible modal dialog attributes and dismisses on Escape key', async () => {
        const ui = new AssessmentUI(schema, container);
        ui.render();

        // Trigger the Clear Progress modal on Welcome screen
        (ui as any).currentRecord.organisation_name = 'Test Org';
        ui.render();

        const clearBtn = container.querySelector('#clearAll') as HTMLButtonElement;
        expect(clearBtn).toBeTruthy();
        clearBtn.click();

        const overlay = document.querySelector('.modal-overlay');
        expect(overlay).toBeTruthy();
        expect(overlay?.getAttribute('role')).toBe('dialog');
        expect(overlay?.getAttribute('aria-modal')).toBe('true');
        expect(overlay?.getAttribute('aria-labelledby')).toBe('modalTitle');

        const title = overlay?.querySelector('#modalTitle');
        expect(title).toBeTruthy();
        expect(title?.textContent).toBe('Clear Progress');

        // Press Escape key
        const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
        document.dispatchEvent(escapeEvent);

        // Modal should be cleaned up from document body
        expect(document.querySelector('.modal-overlay')).toBeNull();
    });
});
