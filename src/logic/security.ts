/**
 * Security and sanitization utilities for safe DOM rendering.
 * Prevents Cross-Site Scripting (DOM XSS) when handling user input or imported JSON.
 */

/**
 * Escapes characters that have special meaning in HTML text and attributes.
 * Prevents markup injection when strings are interpolated into HTML templates.
 */
export function escapeHtml(unsafe: unknown): string {
    if (unsafe === null || unsafe === undefined) {
        return '';
    }
    const str = String(unsafe);
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Escapes attribute values in HTML templates, including quotes and backticks.
 */
export function escapeAttr(unsafe: unknown): string {
    if (unsafe === null || unsafe === undefined) {
        return '';
    }
    const str = String(unsafe);
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/`/g, '&#96;');
}

/**
 * Sanitizes unknown input to guarantee a safe primitive string.
 */
export function sanitizeText(unsafe: unknown, fallback: string = ''): string {
    if (typeof unsafe === 'string') {
        return unsafe;
    }
    if (typeof unsafe === 'number' || typeof unsafe === 'boolean') {
        return String(unsafe);
    }
    return fallback;
}
