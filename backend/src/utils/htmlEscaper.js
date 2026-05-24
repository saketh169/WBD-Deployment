/**
 * Escape HTML entities to prevent injection and formatting issues in emails
 * @param {string} text - Raw text to escape
 * @returns {string} - HTML-safe escaped text
 */
const escapeHtml = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

/**
 * Escape text for use in HTML email templates
 * @param {string} text - Raw text
 * @returns {string} - Safe for embedding in HTML
 */
const sanitizeEmailText = (text) => escapeHtml(text);

module.exports = {
  escapeHtml,
  sanitizeEmailText
};
