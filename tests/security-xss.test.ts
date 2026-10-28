import { describe, it, expect, beforeEach } from 'vitest';
import { AssessmentUI } from '../src/components/AssessmentUI';
import schemaData from '../MATURITY_SCHEMA.json';
import type { Schema, AssessmentRecord } from '../src/types';
import { escapeHtml, escapeAttr } from '../src/logic/security';

describe('B1.3: DOM XSS Prevention & Neutralization', () => {
    let container: HTMLElement;
    const schema = schemaData as Schema;

    beforeEach(() => {
        window.localStorage.clear();
        container = document.createElement('div');
        document.body.innerHTML = '';
        document.body.appendChild(container);
    });

    it('escapes special HTML and attribute characters in security utilities', () => {
        const payload = '<script>alert("XSS") & test \'quoted\'</script>';
        const escaped = escapeHtml(payload);
        expect(escaped).not.toContain('<script>');
        expect(escaped).toContain('&lt;script&gt;');
        expect(escaped).toContain('&amp;');
        expect(escaped).toContain('&quot;');
        expect(escaped).toContain('&#39;');

        const attrPayload = '"><img src=x onerror=`alert(1)`>';
        const escapedAttr = escapeAttr(attrPayload);
        expect(escapedAttr).not.toContain('">');
        expect(escapedAttr).toContain('&quot;&gt;');
        expect(escapedAttr).toContain('&#96;');
    });

    it('renders malicious organisation name as inert text on Welcome and Results screens', () => {
        const maliciousOrg = '<b id="injected-tag">Hacked Org</b><script>window.__xss = true;</script>';

        const ui = new AssessmentUI(schema, container);
        ui.render();

        const orgInput = container.querySelector('#orgName') as HTMLInputElement;
        orgInput.value = maliciousOrg;
        orgInput.dispatchEvent(new Event('input', { bubbles: true }));

        // Start assessment and complete with demo data to get to results
        (ui as any).currentRecord.organisation_name = maliciousOrg;
        (ui as any).currentDimensionIndex = schema.dimensions.length;
        ui.render();

        // Check Results page h2
        const h2 = container.querySelector('h2');
        expect(h2).toBeTruthy();
        // The literal text should be displayed, but NO actual HTML <b> tag or <script> element should exist!
        expect(container.querySelector('#injected-tag')).toBeNull();
        expect(container.querySelector('script')).toBeNull();
        expect(h2?.textContent).toContain('<b id="injected-tag">Hacked Org</b>');
    });

    it('safely neutralizes malicious payload in reflective dimension notes without breaking textarea', () => {
        const maliciousNotes = '</textarea><script id="evil-script">window.__xss = true;</script><div id="evil-div">pwned</div>';

        const ui = new AssessmentUI(schema, container);
        (ui as any).currentRecord.notes[schema.dimensions[0].id] = maliciousNotes;
        (ui as any).currentDimensionIndex = 0;
        ui.render();

        // The evil elements must NOT exist in the DOM outside the textarea
        expect(container.querySelector('#evil-script')).toBeNull();
        expect(container.querySelector('#evil-div')).toBeNull();

        // The textarea's property value should preserve the exact user text safely
        const textarea = container.querySelector('#notes') as HTMLTextAreaElement;
        expect(textarea.value).toBe(maliciousNotes);
    });

    it('renders malicious artefact references as inert text without executing HTML markup', () => {
        const maliciousRef = '<img src="x" onerror="window.__xss=true;" id="malicious-img">';

        const ui = new AssessmentUI(schema, container);
        (ui as any).currentRecord.artefacts.push({
            type: 'workflow',
            ref: maliciousRef,
            name: 'Malicious Payload'
        });
        (ui as any).currentDimensionIndex = 0;
        ui.render();

        // Should NOT render an actual <img> tag
        expect(container.querySelector('#malicious-img')).toBeNull();
        expect(container.querySelector('img')).toBeNull();
        expect(container.querySelector('.pill')?.textContent).toContain(maliciousRef);
    });

    it('renders malicious capability and governance notes safely as inert text', () => {
        const maliciousGovNotes = '</textarea><script id="gov-script">alert("gov");</script>';

        const ui = new AssessmentUI(schema, container);
        (ui as any).currentRecord.governanceNotes = maliciousGovNotes;
        (ui as any).currentDimensionIndex = schema.dimensions.length; // Results page
        ui.render();

        expect(container.querySelector('#gov-script')).toBeNull();
        const govTextarea = container.querySelector('#governanceNotes') as HTMLTextAreaElement;
        expect(govTextarea.value).toBe(maliciousGovNotes);
    });

    it('renders comparison records containing script tags as inert text without injection', () => {
        const maliciousComparison: AssessmentRecord = {
            assessment_id: '<script>evil()</script>',
            organisation_name: '<script id="comp-evil">alert("comp")</script>',
            date_created: '2026-01-01',
            team_mode: false,
            scores: {
                traceability: 2,
                boundary_clarity: 2,
                risk_management: 2,
                accountability: 2,
                policy_alignment: 2,
                review_practices: 2,
                learning_capability: 2
            },
            notes: {},
            artefacts: [
                { type: 'workflow', ref: '<img src=x onerror=alert(1)>', name: '"><script>xss()</script>' }
            ]
        };

        const ui = new AssessmentUI(schema, container);
        (ui as any).currentDimensionIndex = schema.dimensions.length;
        (ui as any).renderResultsWithComparison(maliciousComparison);

        expect(container.querySelector('#comp-evil')).toBeNull();
        expect(container.querySelector('img')).toBeNull();
    });
});
