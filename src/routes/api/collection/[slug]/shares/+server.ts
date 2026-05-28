import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { isAccessRole, requireUser } from '$lib/server/access';
import {
  addShare,
  getResourceSharePayload,
  removeShare,
  shareDomainToResource,
  shareUserToResource,
} from '$lib/server/share';
import { assertCollectionOwner, getCollectionBySlug } from '$lib/templates/collection/server/db';

export const GET: RequestHandler = async ({ params, platform, locals }) => {
  if (!platform) throw error(500, 'No platform');
  const user = requireUser(locals);
  const db = getDb(platform);

  const collection = await getCollectionBySlug(db, params.slug);
  if (!collection) throw error(404, 'Collection not found');
  assertCollectionOwner(collection, user.id);

  return json(await getResourceSharePayload(db, 'collection', collection.id, user.id));
};

export const POST: RequestHandler = async ({ params, platform, locals, request }) => {
  if (!platform) throw error(500, 'No platform');
  const user = requireUser(locals);
  const db = getDb(platform);

  const collection = await getCollectionBySlug(db, params.slug);
  if (!collection) throw error(404, 'Collection not found');
  assertCollectionOwner(collection, user.id);

  const body = (await request.json()) as {
    grantee_type?: string;
    grantee_id?: string;
    domain?: string;
    email?: string;
    access_role?: string;
  };

  if (body.email?.trim()) {
    const member = await shareUserToResource(db, 'collection', collection.id, user.id, {
      email: body.email,
      access_role:
        body.access_role && isAccessRole(body.access_role) ? body.access_role : undefined,
    });
    return json(
      { member, ...(await getResourceSharePayload(db, 'collection', collection.id, user.id)) },
      { status: 201 }
    );
  }

  if (body.domain?.trim()) {
    await shareDomainToResource(db, 'collection', collection.id, user.id, {
      domain: body.domain,
      access_role:
        body.access_role && isAccessRole(body.access_role) ? body.access_role : undefined,
    });
    return json(await getResourceSharePayload(db, 'collection', collection.id, user.id), {
      status: 201,
    });
  }

  if (body.grantee_type === 'domain') {
    throw error(400, 'Use the domain field to share by email domain');
  }
  if (body.grantee_type !== 'group') {
    throw error(400, 'Provide email, domain, or grantee_type group with grantee_id');
  }
  if (!body.grantee_id) throw error(400, 'grantee_id is required');

  const accessRole =
    body.access_role && isAccessRole(body.access_role) ? body.access_role : 'viewer';

  await addShare(db, 'collection', collection.id, 'group', body.grantee_id, user.id, accessRole);
  return json(await getResourceSharePayload(db, 'collection', collection.id, user.id), {
    status: 201,
  });
};

export const DELETE: RequestHandler = async ({ params, platform, locals, request }) => {
  if (!platform) throw error(500, 'No platform');
  const user = requireUser(locals);
  const db = getDb(platform);

  const collection = await getCollectionBySlug(db, params.slug);
  if (!collection) throw error(404, 'Collection not found');
  assertCollectionOwner(collection, user.id);

  const body = (await request.json()) as { grantee_type?: string; grantee_id?: string };
  if (body.grantee_type !== 'domain' && body.grantee_type !== 'group') {
    throw error(400, 'grantee_type must be domain or group');
  }
  if (!body.grantee_id) throw error(400, 'grantee_id is required');

  await removeShare(db, 'collection', collection.id, body.grantee_type, body.grantee_id);
  return new Response(null, { status: 204 });
};
