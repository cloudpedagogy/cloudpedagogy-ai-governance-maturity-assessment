import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { AssessmentUI } from '../src/components/AssessmentUI';
import defaultSchema from '../MATURITY_SCHEMA.json';
import { saveAssessmentToStorage } from '../src/logic/storage';
import type { AssessmentRecord, Schema } from '../src/types';

describe('Final Acceptance Corrections (A, B, C)', () => {
    let container: HTMLElement;
    const schema = defaultSchema as Schema;

    beforeEach(() => {
        window.localStorage.clear();
        document.body.innerHTML = '<div id="app"></div>';
        container = document.getElementById('app')!;
    });

    describe('Correction A — Print and PDF Completeness', () => {
        it('renders print-visible, non-editable capability and governance notes with pre-wrap and safe escaping', () => {
            const multilineCap = 'Paragraph 1: Practical capability.\n\nParagraph 2: Detailed observations with <script>alert("xss")</script> & special chars.';
            const multilineGov = 'Line 1: Risk rationale.\nLine 2: Oversight sign-off.';
            const record: AssessmentRecord = {
                assessment_id: 'print-test-rec',
                organisation_name: 'Print Test Org',
                date_created: '2026-10-28',
                team_mode: false,
                scores: {
                    traceability: 3,
                    boundary_clarity: 2,
                    risk_management: 2,
                    accountability: 3,
                    data_governance: 2,
                    evaluation: 2,
                    lifecycle_management: 2
                },
                notes: {
                    traceability: 'Multi-line dimensional note.\n\nParagraph 2 of dimension note.'
                },
                artefacts: [],
                capabilityNotes: multilineCap,
                governanceNotes: multilineGov
            };
            saveAssessmentToStorage(record, window.localStorage);

            const ui = new AssessmentUI(schema, container);
            (ui as any).renderResults();

            // 1. Verify dedicated print notes card exists
            const printCard = container.querySelector('.gov-print-notes-card');
            expect(printCard).not.toBeNull();

            // 2. Verify capability notes text content and safe escaping (no executable script tag injected)
            const printCap = container.querySelector('#printCapabilityNotes');
            expect(printCap).not.toBeNull();
            expect(printCap?.textContent).toContain('Paragraph 1: Practical capability.');
            expect(printCap?.textContent).toContain('Paragraph 2: Detailed observations with <script>alert("xss")</script> & special chars.');
            expect(container.querySelector('#printCapabilityNotes script')).toBeNull();

            // 3. Verify governance notes content
            const printGov = container.querySelector('#printGovernanceNotes');
            expect(printGov).not.toBeNull();
            expect(printGov?.textContent).toBe(multilineGov);

            // 4. Verify pre-wrap styling is applied
            expect(printCap?.getAttribute('style')).toContain('white-space: pre-wrap');
            expect(printGov?.getAttribute('style')).toContain('white-space: pre-wrap');

            // 5. Verify dimensional notes in table also have pre-wrap
            const dimNoteCell = container.querySelector('.dimension-breakdown-table tbody tr td div');
            expect(dimNoteCell?.getAttribute('style')).toContain('white-space: pre-wrap');
            expect(dimNoteCell?.textContent).toContain('Multi-line dimensional note.\n\nParagraph 2 of dimension note.');
        });

        it('keeps interactive textareas available on screen and syncs live to the print container', () => {
            const ui = new AssessmentUI(schema, container);
            (ui as any).renderResults();

            const capArea = container.querySelector('#capabilityNotes') as HTMLTextAreaElement;
            const govArea = container.querySelector('#governanceNotes') as HTMLTextAreaElement;
            const printCap = container.querySelector('#printCapabilityNotes');
            const printGov = container.querySelector('#printGovernanceNotes');

            expect(capArea).not.toBeNull();
            expect(govArea).not.toBeNull();
            expect(printCap?.textContent).toBe('None recorded.');
            expect(printGov?.textContent).toBe('None recorded.');

            // Type in capability notes
            capArea.value = 'Live updated capability notes';
            capArea.dispatchEvent(new Event('input'));
            expect(printCap?.textContent).toBe('Live updated capability notes');

            // Type in governance notes
            govArea.value = 'Live updated governance notes';
            govArea.dispatchEvent(new Event('input'));
            expect(printGov?.textContent).toBe('Live updated governance notes');
        });

        it('hides interactive details container in print to avoid duplicate notes', () => {
            const ui = new AssessmentUI(schema, container);
            (ui as any).renderResults();

            const interactiveDetails = container.querySelector('details.gov-details');
            expect(interactiveDetails).not.toBeNull();
            expect(interactiveDetails?.classList.contains('hide-in-print')).toBe(true);
        });

        it('preserves and restores details open/closed state across beforeprint and afterprint lifecycle', () => {
            const ui = new AssessmentUI(schema, container);
            (ui as any).renderResults();

            const details = container.querySelector('details.gov-details') as HTMLDetailsElement;
            expect(details).not.toBeNull();

            // Initially closed
            details.open = false;
            expect(details.open).toBe(false);

            // Simulate beforeprint
            window.dispatchEvent(new Event('beforeprint'));
            expect(details.getAttribute('data-was-open')).toBe('false');
            expect(details.open).toBe(true);

            // Simulate afterprint
            window.dispatchEvent(new Event('afterprint'));
            expect(details.hasAttribute('data-was-open')).toBe(false);
            expect(details.open).toBe(false);

            // Now test when initially open
            details.open = true;
            window.dispatchEvent(new Event('beforeprint'));
            expect(details.getAttribute('data-was-open')).toBe('true');
            expect(details.open).toBe(true);

            window.dispatchEvent(new Event('afterprint'));
            expect(details.hasAttribute('data-was-open')).toBe(false);
            expect(details.open).toBe(true);
        });

        it('verifies stylesheet rules for print notes card and no external PDF dependencies', () => {
            const cssPath = path.resolve(__dirname, '../src/style.css');
            const cssContent = fs.readFileSync(cssPath, 'utf-8');

            // Screen style: hidden
            expect(cssContent).toMatch(/\.gov-print-notes-card\s*\{[^}]*display:\s*none/);

            // Print media style: visible and avoid break
            const printBlock = cssContent.slice(cssContent.indexOf('@media print'));
            expect(printBlock).toContain('.gov-print-notes-card');
            expect(printBlock).toContain('display: block !important');
            expect(printBlock).toContain('page-break-inside: avoid !important');
            expect(printBlock).toContain('.print-note-text');
            expect(printBlock).toContain('white-space: pre-wrap !important');

            // Package.json: zero PDF dependencies
            const pkgPath = path.resolve(__dirname, '../package.json');
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            expect(pkg.dependencies).toBeUndefined();
            const devDepKeys = Object.keys(pkg.devDependencies || {});
            expect(devDepKeys.some(d => d.includes('pdf'))).toBe(false);
        });
    });

    describe('Correction B — Accessible Dimension Stepper', () => {
        it('uses semantic nav, ol, and li elements without ARIA tablist/tab roles', () => {
            const ui = new AssessmentUI(schema, container);
            ui.render();

            const orgInput = container.querySelector('#orgName') as HTMLInputElement;
            orgInput.value = 'Stepper Semantic Org';
            const startBtn = container.querySelector('#startBtn') as HTMLButtonElement;
            startBtn.click();

            const nav = container.querySelector('nav.stepper-nav');
            expect(nav).not.toBeNull();
            expect(nav?.getAttribute('aria-label')).toBe('Assessment dimensions progress');

            const ol = nav?.querySelector('ol.stepper-container');
            expect(ol).not.toBeNull();
            expect(ol?.getAttribute('role')).toBeNull();

            const items = ol?.querySelectorAll('li.stepper-item');
            expect(items).toHaveLength(7);
            items?.forEach(li => {
                expect(li.getAttribute('role')).toBeNull();
            });

            const buttons = ol?.querySelectorAll('button.stepper-step');
            expect(buttons).toHaveLength(7);
            buttons?.forEach(btn => {
                expect(btn.getAttribute('role')).toBeNull();
                expect(btn.getAttribute('aria-selected')).toBeNull();
            });
        });

        it('applies aria-current="step" exclusively to the active dimension step', () => {
            const ui = new AssessmentUI(schema, container);
            ui.render();

            const orgInput = container.querySelector('#orgName') as HTMLInputElement;
            orgInput.value = 'Aria Current Org';
            const startBtn = container.querySelector('#startBtn') as HTMLButtonElement;
            startBtn.click();

            const buttons = container.querySelectorAll('.stepper-step');

            // Dimension 0 active
            expect(buttons[0].getAttribute('aria-current')).toBe('step');
            for (let i = 1; i < buttons.length; i++) {
                expect(buttons[i].getAttribute('aria-current')).toBeNull();
            }

            // Navigate to Dimension 3
            (buttons[3] as HTMLButtonElement).click();
            const updatedButtons = container.querySelectorAll('.stepper-step');
            expect(updatedButtons[3].getAttribute('aria-current')).toBe('step');
            expect(updatedButtons[0].getAttribute('aria-current')).toBeNull();
            expect(updatedButtons[1].getAttribute('aria-current')).toBeNull();
            expect(updatedButtons[2].getAttribute('aria-current')).toBeNull();
        });

        it('maintains direct navigation, progress badges, and notes autosave', () => {
            const ui = new AssessmentUI(schema, container);
            ui.render();

            const orgInput = container.querySelector('#orgName') as HTMLInputElement;
            orgInput.value = 'Save Progress Org';
            const startBtn = container.querySelector('#startBtn') as HTMLButtonElement;
            startBtn.click();

            // On Dimension 0: set score and notes
            const radio2 = container.querySelector('input[id="level-2"]') as HTMLInputElement;
            radio2.click();
            const notesArea = container.querySelector('#notes') as HTMLTextAreaElement;
            notesArea.value = 'Stepper saved note';

            // Jump to Dimension 5
            const step5 = container.querySelector('.stepper-step[data-index="5"]') as HTMLButtonElement;
            step5.click();

            // Verify Dimension 0 now has answered badge '✓'
            const step0 = container.querySelector('.stepper-step[data-index="0"]');
            expect(step0?.classList.contains('answered')).toBe(true);
            expect(step0?.querySelector('.step-badge')?.textContent).toBe('✓');

            // Jump back to Dimension 0 and verify note persisted
            (step0 as HTMLButtonElement).click();
            const reloadedNotes = container.querySelector('#notes') as HTMLTextAreaElement;
            expect(reloadedNotes.value).toBe('Stepper saved note');
        });
    });

    describe('Correction C — Documentation Accuracy', () => {
        it('ensures README.md documents the exact runtime storage keys', () => {
            const readmePath = path.resolve(__dirname, '../README.md');
            const readmeContent = fs.readFileSync(readmePath, 'utf-8');

            expect(readmeContent).toContain('`cp_aigov_assessment_v1`');
            expect(readmeContent).toContain('`cp_aigov_history_v1`');

            // Ensure obsolete temporary keys are not in the documentation
            expect(readmeContent).not.toContain('`cloudpedagogy_ai_governance_assessment_v1`');
            expect(readmeContent).not.toContain('`cloudpedagogy_ai_gov_history_v1`');
        });
    });
});
