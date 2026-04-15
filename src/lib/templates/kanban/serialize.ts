// Kanban types and serialization — no gray-matter dependency, safe for client-side
export interface KanbanLabels {
  [name: string]: string;
}

export interface KanbanCard {
  id: string;
  title: string;
  labels: string[];
  body: string;
  column: string;
}

export interface KanbanColumn {
  title: string;
  cards: KanbanCard[];
}

/**
 * Serialize columns back to markdown.
 * Used after drag-and-drop, add card, delete card, etc.
 */
export function serializeKanban(
  frontmatter: Record<string, unknown>,
  columns: KanbanColumn[],
  labels: KanbanLabels
): string {
  const fmLines: string[] = ['---'];
  if (frontmatter.view) fmLines.push(`view: ${frontmatter.view}`);
  if (frontmatter.title) fmLines.push(`title: ${frontmatter.title}`);
  if (Object.keys(labels).length > 0) {
    fmLines.push('labels:');
    for (const [name, color] of Object.entries(labels)) {
      fmLines.push(`  ${name}: "${color}"`);
    }
  }
  for (const [key, value] of Object.entries(frontmatter)) {
    if (!['view', 'title', 'labels'].includes(key)) {
      fmLines.push(`${key}: ${JSON.stringify(value)}`);
    }
  }
  fmLines.push('---');

  const bodyParts: string[] = [];
  for (const col of columns) {
    bodyParts.push(`\n## ${col.title}`);
    for (const card of col.cards) {
      const labelsStr = card.labels.length > 0 ? ` [${card.labels.join(', ')}]` : '';
      bodyParts.push(`\n### ${card.title} {#${card.id}}${labelsStr}`);
      if (card.body) {
        bodyParts.push(card.body);
      }
    }
  }

  return fmLines.join('\n') + '\n' + bodyParts.join('\n') + '\n';
}
