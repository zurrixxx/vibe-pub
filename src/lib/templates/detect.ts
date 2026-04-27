/**
 * Auto-detect whether markdown content should render as 'doc' or 'kanban'.
 *
 * Kanban heuristic: 2+ headings (## level) where each heading is immediately
 * followed by checkbox list items (- [ ] or - [x]).
 *
 * Conservative — only returns 'kanban' when the pattern is unambiguous.
 */
export function detectView(markdown: string): 'doc' | 'kanban' {
  const lines = markdown.split('\n');

  let headingWithCheckboxes = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Match ## headings (level 2+)
    if (/^#{2,}\s+\S/.test(line)) {
      // Look ahead: skip blank lines, then check for checkbox items
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') {
        j++;
      }

      // Check if the next non-blank line is a checkbox item
      if (j < lines.length && /^-\s+\[[ xX]\]/.test(lines[j].trim())) {
        headingWithCheckboxes++;
      }
    }

    i++;
  }

  return headingWithCheckboxes >= 2 ? 'kanban' : 'doc';
}
