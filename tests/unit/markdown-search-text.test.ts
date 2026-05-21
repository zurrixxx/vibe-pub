import { describe, it, expect } from 'vitest';
import {
  markdownBodyToPlain,
  markdownToPlainSearchText,
} from '$lib/templates/collection/search/plaintext';

const KANBAN_SAMPLE = `---
view: kanban
title: Q3 路线图
---

## 0 · Backlog

### 用户系统重构 {#c1} [feature, high priority]
<!-- due: 2025-06-01 -->
- [ ] 支持 OAuth2 登录
- [ ] 多因素认证

## 1 · In Progress

### 性能优化 {#c2} [feature]
首页加载时间 < 1s
`;

describe('markdownBodyToPlain', () => {
  it('strips task checkboxes and keeps task text', () => {
    const plain = markdownBodyToPlain('- [ ] Keyword research\n- [x] Ship');
    expect(plain).toBe('Keyword research Ship');
    expect(plain).not.toMatch(/\[[ x]\]/);
  });

  it('does not turn {#id} into brace noise', () => {
    const plain = markdownBodyToPlain('### Title {#header} [bug]');
    expect(plain).toBe('Title');
    expect(plain).not.toContain('{');
    expect(plain).not.toContain('[');
  });
});

describe('markdownToPlainSearchText', () => {
  it('indexes kanban titles and body without markdown syntax', () => {
    const text = markdownToPlainSearchText(KANBAN_SAMPLE, 'Q3 路线图');
    expect(text).toContain('Q3');
    expect(text).toContain('用户系统重构');
    expect(text).toContain('OAuth2');
    expect(text).toContain('Backlog');
    expect(text).not.toMatch(/\{[^}]*\}/);
    expect(text).not.toMatch(/\[[ x]\]/);
    expect(text).not.toContain('{#');
    expect(text).not.toContain('[feature');
  });

  it('strips doc headings without corrupting words', () => {
    const md = `---
view: doc
---

# Hello

Paragraph with **bold** text.
`;
    const text = markdownToPlainSearchText(md, 'Hello');
    expect(text).toContain('Hello');
    expect(text).toContain('Paragraph with bold text');
    expect(text).not.toContain('#');
  });
});
