/**
 * Line delta between two markdown snapshots — same logic as
 * `src/routes/[slug]/history/+page.svelte` `deltaStat` (index-aligned line compare).
 */
export function deltaStat(
  prevMarkdown: string | null,
  curMarkdown: string
): { add: number; rem: number } {
  if (!prevMarkdown) return { add: curMarkdown.split('\n').filter(Boolean).length, rem: 0 };
  const oldLines = prevMarkdown.split('\n');
  const newLines = curMarkdown.split('\n');
  const max = Math.max(oldLines.length, newLines.length);
  let add = 0;
  let rem = 0;
  for (let i = 0; i < max; i++) {
    if (oldLines[i] === newLines[i]) continue;
    if (oldLines[i] !== undefined) rem++;
    if (newLines[i] !== undefined) add++;
  }
  return { add, rem };
}
