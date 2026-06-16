import { load } from 'js-yaml';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { createHighlighter, createJavaScriptRegexEngine } from 'shiki';
import type { PageFrontmatter } from '$lib/types';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

export function parseFrontmatter(raw: string): {
  data: Partial<PageFrontmatter>;
  content: string;
} {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    return { data: {}, content: raw };
  }

  const parsed = load(match[1] ?? '');
  const data =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Partial<PageFrontmatter>)
      : {};

  return { data, content: raw.slice(match[0].length) };
}

let highlighterPromise: ReturnType<typeof createHighlighter> | null = null;

/**
 * Use JS RegExp engine (not Oniguruma WASM) so highlighting works on Cloudflare Workers.
 * Default Shiki WASM often fails in Workers; see https://github.com/shikijs/shiki/issues/590
 */
function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-dark'],
      langs: [
        'javascript',
        'typescript',
        'python',
        'bash',
        'json',
        'html',
        'css',
        'sql',
        'yaml',
        'markdown',
        'go',
        'rust',
        'java',
        'ruby',
        'php',
        'swift',
        'kotlin',
        'c',
        'cpp',
      ],
      engine: createJavaScriptRegexEngine(),
    });
  }
  return highlighterPromise;
}

export async function renderMarkdown(md: string): Promise<string> {
  let highlighter: Awaited<ReturnType<typeof createHighlighter>> | null = null;
  try {
    highlighter = await getHighlighter();
  } catch {
    // Shiki may fail in Workers (WASM loading issues) — fall back to plain code blocks
  }

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkBreaks)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeStringify);

  const highlighted = md.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    const language = lang || 'text';
    if (highlighter) {
      try {
        return highlighter.codeToHtml(code.trimEnd(), {
          lang: language,
          theme: 'github-dark',
        });
      } catch {
        // fall through to plain rendering
      }
    }
    return `<pre><code class="language-${language}">${escapeHtml(code)}</code></pre>`;
  });

  const result = await processor.process(highlighted);
  return String(result);
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
