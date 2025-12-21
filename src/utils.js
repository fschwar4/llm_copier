// --- Utils functions for LLM Copier Extension ---

// --- Helper: Convert string to Title Case ---
// Examples: toTitleCase('karl') => "Karl"
//           toTitleCase('karl.smith') => "Karl Smith"
//           toTitleCase('john_doe') => "John Doe"
export function toTitleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(/[._-\s]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
