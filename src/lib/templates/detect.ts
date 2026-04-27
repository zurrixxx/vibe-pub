/**
 * Auto-detect whether markdown content should render as 'doc', 'kanban', 'changelog', or 'timeline'.
 *
 * Kanban heuristic: 2+ headings (## level) where each heading is immediately
 * followed by checkbox list items (- [ ] or - [x]).
 *
 * Changelog heuristic: 2+ `## [version]` headings (version in brackets, optional date),
 * each with at least one `### Category` sub-heading.
 *
 * Timeline heuristic: 2+ `## Section` headings (NOT matching changelog's `## [version]` pattern),
 * each with at least one `### Period` sub-heading followed by list items.
 *
 * Conservative — only returns non-doc when the pattern is unambiguous.
 *
 * Note: slides are ONLY detected via frontmatter `view: slides` (not heuristic),
 * because --- is ambiguous (could be a horizontal rule).
 */
export function detectView(
  markdown: string
): 'doc' | 'kanban' | 'changelog' | 'timeline' | 'dashboard' {
  const lines = markdown.split('\n');

  // ── Changelog detection ── (must run before timeline to avoid false matches)
  let releaseHeadings = 0;
  let releasesWithCategory = 0;
  let currentIsRelease = false;

  for (const line of lines) {
    const trimmed = line.trim();
    // ## [version] or ## [version] - date
    if (/^##\s+\[[^\]]+\]/.test(trimmed) && !trimmed.startsWith('###')) {
      releaseHeadings++;
      currentIsRelease = true;
      continue;
    }
    // ### Category under a release heading
    if (/^###\s+\S/.test(trimmed) && currentIsRelease) {
      releasesWithCategory++;
      currentIsRelease = false; // only count once per release
      continue;
    }
  }

  if (releaseHeadings >= 2 && releasesWithCategory >= 2) {
    return 'changelog';
  }

  // ── Timeline detection ──
  // 2+ ## headings (without [version] brackets) each with at least one ### + list items
  let timelineSections = 0;
  let sectionsWithPeriodAndItems = 0;
  let inSection = false;
  let inPeriod = false;
  let periodHasItems = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // ## Section heading (must NOT be changelog-style [version])
    if (/^##\s+\S/.test(trimmed) && !trimmed.startsWith('###') && !/^##\s+\[/.test(trimmed)) {
      // Flush previous section
      if (inSection && inPeriod && periodHasItems) {
        sectionsWithPeriodAndItems++;
      }
      timelineSections++;
      inSection = true;
      inPeriod = false;
      periodHasItems = false;
      continue;
    }

    // ### Period heading under a section
    if (/^###\s+\S/.test(trimmed) && inSection) {
      // Flush previous period
      if (inPeriod && periodHasItems && !sectionsWithPeriodAndItems) {
        // Already counted this section? Only count once per section.
      }
      if (inPeriod && periodHasItems) {
        sectionsWithPeriodAndItems++;
        // Mark section as counted by resetting inSection tracking for this purpose
        inSection = false; // prevent double-counting this section
      }
      inPeriod = true;
      periodHasItems = false;
      continue;
    }

    // - list item under a period
    if (/^-\s+\S/.test(trimmed) && inPeriod) {
      periodHasItems = true;
      continue;
    }
  }
  // Flush final section
  if (inSection && inPeriod && periodHasItems) {
    sectionsWithPeriodAndItems++;
  }

  // Require 3+ matching sections AND at least 70% of all sections must match.
  // This prevents structured docs (many ## with ### subsections + lists) from
  // being mis-detected as timelines.
  if (
    timelineSections >= 3 &&
    sectionsWithPeriodAndItems >= 3 &&
    sectionsWithPeriodAndItems >= timelineSections * 0.7
  ) {
    return 'timeline';
  }

  // ── Kanban detection ──
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
