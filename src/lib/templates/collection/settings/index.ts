export type CollectionViewPill = 'doc' | 'deck' | 'kanban';

export type SettingsChapter = {
  id: string;
  pageSlug: string;
  title: string;
  view: string;
  detectedView: string;
  partId: string | null;
  sortOrder: number;
  filename: string;
};

export type SettingsPart = {
  id: string;
  title: string;
  partNum: string;
};

export type SettingsListRow =
  | { type: 'ungrouped-label' }
  | { type: 'part'; part: SettingsPart; partIndex: number; isFirstPart: boolean }
  | { type: 'empty-part-drop'; part: SettingsPart; partIndex: number; insertAt: number }
  | { type: 'chapter'; chapterIndex: number };

/** Map stored page view to settings pill label (deck = slides). */
export function viewToPill(view: string): CollectionViewPill {
  if (view === 'slides') return 'deck';
  if (view === 'kanban') return 'kanban';
  return 'doc';
}

export type DropSlot = {
  insertAt: number;
  partId: string | null;
};

/** Where a new chapter would be inserted for this part (including when empty). */
export function insertIndexForPart(
  chapters: { partId: string | null }[],
  parts: SettingsPart[],
  partIndex: number
): number {
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    if (!ch.partId) continue;
    const idx = parts.findIndex((p) => p.id === ch.partId);
    if (idx > partIndex) return i;
  }
  for (let i = 0; i < chapters.length; i++) {
    if (!chapters[i].partId) return i;
  }
  return chapters.length;
}

export function buildSettingsListRows(
  chapters: SettingsChapter[],
  parts: SettingsPart[]
): SettingsListRow[] {
  const rows: SettingsListRow[] = [];
  const ungrouped = chapters.map((ch, i) => i).filter((i) => !chapters[i].partId);

  if (ungrouped.length > 0 && parts.length > 0) {
    rows.push({ type: 'ungrouped-label' });
  }
  for (const i of ungrouped) {
    rows.push({ type: 'chapter', chapterIndex: i });
  }

  for (let partIndex = 0; partIndex < parts.length; partIndex++) {
    const part = parts[partIndex];
    const isFirstPart = partIndex === 0 && ungrouped.length === 0;
    const inPart = chapters.map((ch, i) => i).filter((i) => chapters[i].partId === part.id);

    rows.push({ type: 'part', part, partIndex, isFirstPart });

    if (inPart.length === 0) {
      rows.push({
        type: 'empty-part-drop',
        part,
        partIndex,
        insertAt: insertIndexForPart(chapters, parts, partIndex),
      });
    } else {
      for (const i of inPart) {
        rows.push({ type: 'chapter', chapterIndex: i });
      }
    }
  }

  return rows;
}

/** Drop slot between chapters (not directly under a part header — that uses after-part). */
export function showBeforeChapterSlot(
  rowIndex: number,
  rows: SettingsListRow[],
  parts: SettingsPart[]
): boolean {
  const row = rows[rowIndex];
  if (row?.type !== 'chapter') return false;
  const prev = rows[rowIndex - 1];
  if (!prev) return parts.length === 0;
  return prev.type === 'chapter' || prev.type === 'ungrouped-label';
}

export function listRowKey(row: SettingsListRow): string {
  switch (row.type) {
    case 'ungrouped-label':
      return 'ungrouped-label';
    case 'part':
      return `part-${row.part.id}`;
    case 'empty-part-drop':
      return `empty-${row.part.id}`;
    case 'chapter':
      return `ch-${row.chapterIndex}`;
  }
}

/** Drop slots above the first Part header are not allowed. */
export function isSlotAboveFirstPart(
  slotId: string,
  chapters: { partId: string | null }[],
  parts: SettingsPart[]
): boolean {
  if (parts.length === 0) return false;
  const hasUngrouped = chapters.some((ch) => !ch.partId);
  if (hasUngrouped) return false;
  return slotId === `before-part-${parts[0].id}`;
}

export function buildDropSlotMap(
  chapters: { partId: string | null }[],
  parts: SettingsPart[]
): Map<string, DropSlot> {
  const slots = new Map<string, DropSlot>();
  const ungroupedCount = chapters.filter((ch) => !ch.partId).length;

  for (let pi = 0; pi < parts.length; pi++) {
    const part = parts[pi];
    const insertAt = insertIndexForPart(chapters, parts, pi);
    const isFirstPart = pi === 0 && ungroupedCount === 0;
    const inPartCount = chapters.filter((ch) => ch.partId === part.id).length;

    slots.set(`before-part-${part.id}`, {
      insertAt,
      partId: isFirstPart ? null : (parts[pi - 1]?.id ?? null),
    });
    slots.set(`after-part-${part.id}`, { insertAt, partId: part.id });
    if (inPartCount === 0) {
      slots.set(`in-part-${part.id}`, { insertAt, partId: part.id });
    }
  }

  for (let i = 0; i < chapters.length; i++) {
    slots.set(`before-${i}`, {
      insertAt: i,
      partId: i > 0 ? chapters[i - 1].partId : (chapters[0]?.partId ?? null),
    });
  }

  if (chapters.length > 0) {
    slots.set('after-last', {
      insertAt: chapters.length,
      partId: chapters[chapters.length - 1].partId,
    });
  }

  return slots;
}

export function isNoOpDrop(
  dragFrom: number,
  slot: DropSlot,
  chapter: { partId: string | null }
): boolean {
  if (slot.partId !== chapter.partId) return false;
  return slot.insertAt === dragFrom || slot.insertAt === dragFrom + 1;
}

export function computeSortOrders(chapters: SettingsChapter[]): Map<string, number> {
  const counters = new Map<string | null, number>();
  const out = new Map<string, number>();
  for (const ch of chapters) {
    const key = ch.partId;
    const order = counters.get(key) ?? 0;
    out.set(ch.id, order);
    counters.set(key, order + 1);
  }
  return out;
}
