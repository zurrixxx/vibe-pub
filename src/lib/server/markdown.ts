import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeRaw from 'rehype-raw';
import { createHighlighter } from 'shiki';
import type { PageFrontmatter } from '$lib/types';

let highlighterPromise: ReturnType<typeof createHighlighter> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: [
        'javascript', 'typescript', 'python', 'bash', 'json',
        'html', 'css', 'sql', 'yaml', 'markdown', 'go', 'rust',
        'java', 'ruby', 'php', 'swift', 'kotlin', 'c', 'cpp'
      ]
    });
  }
  return highlighterPromise;
}

export function parseFrontmatter(raw: string): { data: Partial<PageFrontmatter>; content: string } {
  const { data, content } = matter(raw);
  return { data: data as Partial<PageFrontmatter>, content };
}

export async function renderMarkdown(md: string): Promise<string> {
  const highlighter = await getHighlighter();

  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeStringify);

  // Pre-process code blocks with Shiki
  const highlighted = md.replace(
    /```(\w+)?\n([\s\S]*?)```/g,
    (_, lang, code) => {
      const language = lang || 'text';
      try {
        return highlighter.codeToHtml(code.trimEnd(), {
          lang: language,
          themes: { light: 'github-light', dark: 'github-dark' }
        });
      } catch {
        return `<pre><code class="language-${language}">${escapeHtml(code)}</code></pre>`;
      }
    }
  );

  const result = await processor.process(highlighted);
  return String(result);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
