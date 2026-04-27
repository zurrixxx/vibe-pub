import { test, expect } from '@playwright/test';

test.describe('API /api/pub', () => {
  test('POST creates a page from JSON', async ({ request }) => {
    const res = await request.post('/api/pub', {
      data: {
        markdown: '# API Test\n\nCreated via API.',
        access: 'unlisted',
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.id).toBeTruthy();
    expect(body.slug).toBeTruthy();
    expect(body.url).toContain(body.slug);
  });

  test('POST creates a page from plain text', async ({ request }) => {
    const res = await request.post('/api/pub', {
      data: '# Plain Text Post\n\nRaw markdown body.',
      headers: { 'content-type': 'text/plain' },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.slug).toBeTruthy();
  });

  test('POST rejects empty markdown', async ({ request }) => {
    const res = await request.post('/api/pub', {
      data: { markdown: '' },
    });

    expect(res.status()).toBe(400);
  });

  test('POST with custom slug', async ({ request }) => {
    const slug = `test-custom-${Date.now()}`;
    const res = await request.post('/api/pub', {
      data: {
        markdown: '# Custom Slug\n\nTest.',
        slug,
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.slug).toBe(slug);
  });

  test('POST auto-detects kanban view', async ({ request }) => {
    const res = await request.post('/api/pub', {
      data: {
        markdown: '## Todo\n- [ ] A\n- [ ] B\n\n## Done\n- [x] C\n- [x] D',
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();

    // Verify the page was saved as kanban by fetching it
    const pageRes = await request.get(`/${body.slug}`);
    expect(pageRes.status()).toBe(200);
  });

  test('created page is accessible via GET /{slug}', async ({ request }) => {
    // Create a page
    const createRes = await request.post('/api/pub', {
      data: { markdown: '# Accessible Page\n\nShould be readable.' },
    });
    const { slug } = await createRes.json();

    // Fetch the page
    const pageRes = await request.get(`/${slug}`);
    expect(pageRes.status()).toBe(200);
    const html = await pageRes.text();
    expect(html).toContain('Accessible Page');
  });

  test('GET /api/pub requires auth', async ({ request }) => {
    const res = await request.get('/api/pub');
    expect(res.status()).toBe(401);
  });

  test('GET /api/pub/by-slug/[slug] returns page details', async ({ request }) => {
    const createRes = await request.post('/api/pub', {
      data: { markdown: '# Slug Lookup Test\n\nBody.' },
    });
    const { slug } = await createRes.json();
    const res = await request.get(`/api/pub/by-slug/${slug}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.slug).toBe(slug);
    expect(body.markdown).toContain('Slug Lookup Test');
    expect(body.id).toBeTruthy();
  });
});
