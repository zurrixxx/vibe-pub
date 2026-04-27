import { test, expect } from '@playwright/test';

async function publishPage(request: any, markdown: string): Promise<{ id: string; slug: string }> {
  const res = await request.post('/api/pub', { data: { markdown } });
  return res.json();
}

test.describe('Version snapshots', () => {
  test('update creates a version snapshot', async ({ request }) => {
    const { id, slug } = await publishPage(request, '# Version 1\n\nOriginal.');
    const updateRes = await request.put(`/api/pub/${id}`, {
      data: { markdown: '# Version 2\n\nUpdated.' },
    });
    expect(updateRes.status()).toBe(200);
    const versionsRes = await request.get(`/api/pub/${id}/versions`);
    expect(versionsRes.status()).toBe(200);
    const versions = await versionsRes.json();
    expect(versions.length).toBe(1);
    expect(versions[0].version).toBe(1);
    const v1Res = await request.get(`/api/pub/${id}/versions/1`);
    expect(v1Res.status()).toBe(200);
    const v1 = await v1Res.json();
    expect(v1.markdown).toContain('Version 1');
  });

  test('multiple updates create sequential versions', async ({ request }) => {
    const { id } = await publishPage(request, '# V1');
    await request.put(`/api/pub/${id}`, { data: { markdown: '# V2' } });
    await request.put(`/api/pub/${id}`, { data: { markdown: '# V3' } });
    const versionsRes = await request.get(`/api/pub/${id}/versions`);
    const versions = await versionsRes.json();
    expect(versions.length).toBe(2);
    expect(versions[0].version).toBe(2);
    expect(versions[1].version).toBe(1);
  });

  test('resolve marks comments as resolved', async ({ request }) => {
    const { id } = await publishPage(request, '# Resolve Test');
    const commentRes = await request.post(`/api/comment/${id}`, {
      data: { body: 'Fix the typo', display_name: 'reviewer' },
    });
    const comment = await commentRes.json();
    expect(comment.resolved).toBe(0);
    const resolveRes = await request.post(`/api/pub/${id}/resolve`, {
      data: { comment_ids: [comment.id] },
    });
    expect(resolveRes.status()).toBe(200);
    const commentsRes = await request.get(`/api/comment/${id}`);
    const comments = await commentsRes.json();
    expect(comments.find((c: any) => c.id === comment.id).resolved).toBe(1);
  });

  test('resolve --all resolves all comments', async ({ request }) => {
    const { id } = await publishPage(request, '# Resolve All Test');
    await request.post(`/api/comment/${id}`, { data: { body: 'Comment 1' } });
    await request.post(`/api/comment/${id}`, { data: { body: 'Comment 2' } });
    const resolveRes = await request.post(`/api/pub/${id}/resolve`, {
      data: { all: true },
    });
    expect(resolveRes.status()).toBe(200);
    const commentsRes = await request.get(`/api/comment/${id}`);
    const comments = await commentsRes.json();
    expect(comments.every((c: any) => c.resolved === 1)).toBe(true);
  });
});
