/**
 * Utility functions for formatting, file validation, and browser operations.
 */

/**
 * Format a byte count as a human-readable file size string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Format an ISO date string as a readable date.
 * @param {string} isoString - ISO 8601 date string
 * @returns {string}
 */
export function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Generate a download-friendly file name from a title and type.
 * Slugifies the title (lowercase, spaces to hyphens, strip special chars),
 * appends the type, and adds a .txt extension.
 * @param {string} title
 * @param {string} type - e.g. 'transcript', 'summary'
 * @returns {string}
 */
export function generateFileName(title, type) {
  const slug = title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  return `${slug}-${type}.txt`;
}

/**
 * Check whether a File-like object represents an audio file.
 * Accepts audio/* MIME types and video/mp4 (some recorders produce this).
 * @param {{ type: string }} file
 * @returns {boolean}
 */
export function isAudioFile(file) {
  return file.type.startsWith('audio/') || file.type === 'video/mp4';
}

/**
 * Trigger a text file download in the browser.
 * @param {string} text - file contents
 * @param {string} fileName - suggested file name
 */
export function downloadText(text, fileName) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copy text to the system clipboard.
 * @param {string} text
 * @returns {Promise<void>}
 */
export function copyToClipboard(text) {
  return navigator.clipboard.writeText(text);
}
