import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('B3.4: Print and PDF Presentation Stylesheet', () => {
    const cssPath = path.resolve(__dirname, '../src/style.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    it('contains a dedicated @media print block', () => {
        expect(cssContent).toContain('@media print');
    });

    it('hides interactive buttons, inputs, steppers, and navigation controls in print', () => {
        const printBlock = cssContent.slice(cssContent.indexOf('@media print'));
        expect(printBlock).toContain('.hide-in-print');
        expect(printBlock).toContain('.nav-buttons');
        expect(printBlock).toContain('.stepper-nav');
        expect(printBlock).toContain('button');
        expect(printBlock).toContain('.pill-edit');
        expect(printBlock).toContain('.pill-delete');
        expect(printBlock).toContain('.revisit-dim-btn');
        expect(printBlock).toContain('display: none !important');
    });

    it('forces expandable details open during print so essential governance notes remain visible', () => {
        const printBlock = cssContent.slice(cssContent.indexOf('@media print'));
        expect(printBlock).toContain('details');
        expect(printBlock).toContain('display: block !important');
    });

    it('prevents awkward page splits by declaring page-break-inside: avoid on cards and tables', () => {
        const printBlock = cssContent.slice(cssContent.indexOf('@media print'));
        expect(printBlock).toContain('page-break-inside: avoid !important');
        expect(printBlock).toContain('break-inside: avoid !important');
    });

    it('ensures high-contrast typography and borders for monochrome and print-to-PDF output', () => {
        const printBlock = cssContent.slice(cssContent.indexOf('@media print'));
        expect(printBlock).toContain('color: #000000 !important');
        expect(printBlock).toContain('print-color-adjust: exact !important');
    });
});
