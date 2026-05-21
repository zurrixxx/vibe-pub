import { browser } from '$app/environment';
import { get, writable } from 'svelte/store';
import type { PageTheme } from '$lib/types';

const STORAGE_KEY = 'vibe-reader-appearance-v1';

export type ReaderMeasure = '680px' | '780px' | '880px';
export type ReaderReadingMode = 'paged' | 'scroll';

export const READER_DARK_THEMES: PageTheme[] = [
  'terminal',
  'midnight',
  'raycast',
  'monokai',
  'dracula',
];

export const READER_APPEARANCE_THEMES: {
  id: PageTheme;
  label: string;
  chipClass: string;
}[] = [
  { id: 'default', label: 'default', chipClass: 'ap-chip-default' },
  { id: 'paper', label: 'paper', chipClass: 'ap-chip-paper' },
  { id: 'claude', label: 'claude', chipClass: 'ap-chip-claude' },
  { id: 'solarized', label: 'solarized', chipClass: 'ap-chip-solarized' },
  { id: 'midnight', label: 'midnight', chipClass: 'ap-chip-midnight' },
  { id: 'terminal', label: 'terminal', chipClass: 'ap-chip-terminal' },
];

export const READER_MEASURE_OPTIONS: {
  value: ReaderMeasure;
  label: string;
}[] = [
  { value: '680px', label: 'narrow' },
  { value: '780px', label: 'normal' },
  { value: '880px', label: 'wide' },
];

const LEGACY_MEASURE_MAP: Record<string, ReaderMeasure> = {
  '580px': '680px',
  '680px': '780px',
  '780px': '880px',
};

function normalizeMeasure(raw: unknown): ReaderMeasure | null {
  if (typeof raw !== 'string') return null;
  if (READER_MEASURE_OPTIONS.some((o) => o.value === raw)) {
    return raw as ReaderMeasure;
  }
  return LEGACY_MEASURE_MAP[raw] ?? null;
}

type AppearancePrefs = {
  fontSize: number;
  measure: ReaderMeasure;
  readingMode: ReaderReadingMode;
};

function loadPrefs(): AppearancePrefs {
  const defaults: AppearancePrefs = {
    fontSize: 18,
    measure: '780px',
    readingMode: 'paged',
  };
  if (!browser) return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<AppearancePrefs>;
    const fontSize =
      typeof parsed.fontSize === 'number' && parsed.fontSize >= 14 && parsed.fontSize <= 22
        ? parsed.fontSize
        : defaults.fontSize;
    const measure = normalizeMeasure(parsed.measure) ?? defaults.measure;
    const readingMode =
      parsed.readingMode === 'scroll' || parsed.readingMode === 'paged'
        ? parsed.readingMode
        : defaults.readingMode;
    return { fontSize, measure, readingMode };
  } catch {
    return defaults;
  }
}

const initialPrefs = loadPrefs();

/** Session theme override (null = use published / collection default). */
export const readerThemePreview = writable<PageTheme | null>(null);
export const readerFontSize = writable(initialPrefs.fontSize);
export const readerMeasure = writable<ReaderMeasure>(initialPrefs.measure);
export const readerReadingMode = writable<ReaderReadingMode>(initialPrefs.readingMode);

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist() {
  if (!browser) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        fontSize: get(readerFontSize),
        measure: get(readerMeasure),
        readingMode: get(readerReadingMode),
      })
    );
  }, 120);
}

if (browser) {
  readerFontSize.subscribe(schedulePersist);
  readerMeasure.subscribe(schedulePersist);
  readerReadingMode.subscribe(schedulePersist);
}

export function readerEffectiveTheme(published: PageTheme | null | undefined): PageTheme {
  return (get(readerThemePreview) ?? published ?? 'default') as PageTheme;
}

export function readerThemeIsDark(theme: PageTheme): boolean {
  return READER_DARK_THEMES.includes(theme);
}

export function measureLabel(measure: ReaderMeasure): string {
  return READER_MEASURE_OPTIONS.find((o) => o.value === measure)?.label ?? 'normal';
}
