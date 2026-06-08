import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes raw SVG text using DOMPurify.
 * @param rawSvg The dirty SVG string.
 * @returns The sanitized SVG string.
 */
export function sanitizeSvg(rawSvg: string): string {
  return DOMPurify.sanitize(rawSvg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['svg'],
    ADD_ATTR: ['xmlns', 'viewBox'] // Ensure basic SVG attributes are kept
  });
}
