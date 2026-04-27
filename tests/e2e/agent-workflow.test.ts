import { test, expect } from '@playwright/test';

test.describe('Agent workflow: publish → comment → regen → resolve', () => {
  test('full cycle', async ({ request }) => {
    // 1. Publish
    const pub = await (
      await request.post('/api/pub', {
        data: { markdown: '# Agent Report\n\n## Security\n\nJWT tokens expire after 7 days.' },
      })
    ).json();
    expect(pub.slug).toBeTruthy();

    // 2. Human adds comment
    const comment = await (
      await request.post(`/api/comment/${pub.id}`, {
        data: { body: 'Should be 24 hours, not 7 days', display_name: 'reviewer' },
      })
    ).json();
    expect(comment.id).toBeTruthy();

    // 3. Agent reads comments
    const comments = await (await request.get(`/api/comment/${pub.id}`)).json();
    expect(comments.length).toBe(1);
    expect(comments[0].body).toContain('24 hours');

    // 4. Agent regenerates with feedback incorporated
    const updateRes = await request.put(`/api/pub/${pub.id}`, {
      data: { markdown: '# Agent Report\n\n## Security\n\nJWT tokens expire after 24 hours.' },
    });
    expect(updateRes.status()).toBe(200);

    // 5. Verify version was created
    const versions = await (await request.get(`/api/pub/${pub.id}/versions`)).json();
    expect(versions.length).toBe(1);
    expect(versions[0].version).toBe(1);

    // 6. Verify old version has original content
    const v1 = await (await request.get(`/api/pub/${pub.id}/versions/1`)).json();
    expect(v1.markdown).toContain('7 days');

    // 7. Agent resolves the comment
    const resolveRes = await request.post(`/api/pub/${pub.id}/resolve`, {
      data: { all: true },
    });
    expect(resolveRes.status()).toBe(200);

    // 8. Verify comment is resolved
    const finalComments = await (await request.get(`/api/comment/${pub.id}`)).json();
    expect(finalComments[0].resolved).toBe(1);

    // 9. Verify current page has updated content
    const page = await (await request.get(`/api/pub/by-slug/${pub.slug}`)).json();
    expect(page.markdown).toContain('24 hours');
  });
});
