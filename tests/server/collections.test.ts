import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import app from '../../server';

function resetCollections() {
  // Respect the same override as server.js to avoid touching the real collections.json
  const envPath = process.env.COLLECTIONS_FILE;
  const p = envPath && envPath.trim()
    ? (path.isAbsolute(envPath) ? envPath : path.join(process.cwd(), envPath))
    : path.join(process.cwd(), 'data', 'collections.test.json');
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

describe('Collections API', () => {
  beforeEach(() => resetCollections());

  it('creates, updates, lists, and deletes a collection', async () => {
    // create
    const create = await request(app).post('/api/collections').send({ name: 'My Col', description: 'd', modelIds: ['a', 'a', 'b'], tags: ['t', 'T'], images: ['x'] });
    expect(create.status).toBe(200);
    expect(create.body.success).toBe(true);
    const id = create.body.collection.id;

    // list
    const list = await request(app).get('/api/collections');
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.collections)).toBe(true);

    // update
    const update = await request(app).post('/api/collections').send({ id, name: 'New Name', modelIds: ['b', 'c'] });
    expect(update.status).toBe(200);
    expect(update.body.collection.name).toBe('New Name');
    expect(update.body.collection.modelIds).toEqual(['b', 'c']);

    // delete
    const del = await request(app).delete(`/api/collections/${id}`);
    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);
  });

  it('normalizes groups and keeps them in sync with collection membership', async () => {
    const create = await request(app).post('/api/collections').send({
      name: 'Dragon Variants',
      modelIds: ['loose-1', 'm1', 'm2', 'm3'],
      groups: [
        { name: 'Dragon Model', modelIds: ['m1', 'm2', 'm1'] },
        { name: 'Second Group', modelIds: ['m3'] },
      ],
    });

    expect(create.status).toBe(200);
    expect(create.body.collection.modelIds).toEqual(['loose-1', 'm1', 'm2', 'm3']);
    expect(create.body.collection.groups).toHaveLength(2);
    expect(create.body.collection.groups[0].modelIds).toEqual(['m1', 'm2']);
    expect(create.body.collection.groups[1].modelIds).toEqual(['m3']);

    // Omitting `groups` prunes membership rather than leaving stale ids behind.
    const id = create.body.collection.id;
    const update = await request(app).post('/api/collections').send({
      id,
      name: 'Dragon Variants',
      modelIds: ['loose-1', 'm1', 'm3'],
    });

    expect(update.status).toBe(200);
    expect(update.body.collection.modelIds).toEqual(['loose-1', 'm1', 'm3']);
    expect(update.body.collection.groups).toHaveLength(2);
    expect(update.body.collection.groups[0].modelIds).toEqual(['m1']);
    expect(update.body.collection.groups[1].modelIds).toEqual(['m3']);
  });

  it('treats modelIds as authoritative and never resurrects a removed model', async () => {
    const create = await request(app).post('/api/collections').send({
      name: 'Authoritative',
      modelIds: ['keep', 'drop'],
      groups: [{ id: 'g1', name: 'Fam', modelIds: ['keep', 'drop'] }],
    });
    expect(create.status).toBe(200);
    const id = create.body.collection.id;

    // A client shipping a stale `groups` array must not add `drop` back.
    const stale = await request(app).post('/api/collections').send({
      id,
      name: 'Authoritative',
      modelIds: ['keep'],
      groups: [{ id: 'g1', name: 'Fam', modelIds: ['keep', 'drop'] }],
    });
    expect(stale.status).toBe(400);
    expect(stale.body.error).toMatch(/not in the collection/i);

    const consistent = await request(app).post('/api/collections').send({
      id,
      name: 'Authoritative',
      modelIds: ['keep'],
      groups: [{ id: 'g1', name: 'Fam', modelIds: ['keep'] }],
    });
    expect(consistent.status).toBe(200);
    expect(consistent.body.collection.modelIds).toEqual(['keep']);
  });

  it('rejects a model claimed by two groups instead of deleting one', async () => {
    const res = await request(app).post('/api/collections').send({
      name: 'Duplicates',
      modelIds: ['m1', 'm2'],
      groups: [
        { id: 'gA', name: 'A', modelIds: ['m1', 'm2'] },
        { id: 'gB', name: 'B', modelIds: ['m1'] },
      ],
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/more than one group/i);
  });

  it('keeps a group that has lost its last member', async () => {
    const create = await request(app).post('/api/collections').send({
      name: 'Empties',
      modelIds: ['only'],
      groups: [{ id: 'g1', name: 'Keep My Name', description: 'notes', modelIds: ['only'] }],
    });
    expect(create.status).toBe(200);

    const update = await request(app).post('/api/collections').send({
      id: create.body.collection.id,
      name: 'Empties',
      modelIds: [],
    });
    expect(update.status).toBe(200);
    expect(update.body.collection.groups).toHaveLength(1);
    expect(update.body.collection.groups[0].name).toBe('Keep My Name');
    expect(update.body.collection.groups[0].description).toBe('notes');
    expect(update.body.collection.groups[0].modelIds).toEqual([]);
  });

  it('strips unexpected keys from group payloads', async () => {
    const res = await request(app).post('/api/collections').send({
      name: 'Strict',
      modelIds: ['m1'],
      groups: [{ id: 'g1', name: 'G', modelIds: ['m1'], hidden: true, evil: { deep: [1, 2] }, groups: [{ id: 'nested' }] }],
    });
    expect(res.status).toBe(200);
    expect(Object.keys(res.body.collection.groups[0]).sort()).toEqual(['description', 'id', 'modelIds', 'name']);
  });

  it('preserves membership when modelIds is omitted entirely', async () => {
    const create = await request(app).post('/api/collections').send({ name: 'Rename Me', modelIds: ['m1', 'm2'] });
    expect(create.status).toBe(200);

    const renamed = await request(app).post('/api/collections').send({ id: create.body.collection.id, name: 'Renamed' });
    expect(renamed.status).toBe(200);
    expect(renamed.body.collection.name).toBe('Renamed');
    expect(renamed.body.collection.modelIds).toEqual(['m1', 'm2']);
  });

  it('does not rewrite unrelated collections when one is written', async () => {
    const untouched = await request(app).post('/api/collections').send({ name: 'Bystander', modelIds: ['b1'] });
    const target = await request(app).post('/api/collections').send({ name: 'Target', modelIds: ['t1'] });

    const before = await request(app).get('/api/collections');
    const beforeBystander = before.body.collections.find((c: any) => c.id === untouched.body.collection.id);

    await request(app).post('/api/collections').send({ id: target.body.collection.id, name: 'Target Renamed', modelIds: ['t1'] });

    const after = await request(app).get('/api/collections');
    const afterBystander = after.body.collections.find((c: any) => c.id === untouched.body.collection.id);
    expect(afterBystander).toEqual(beforeBystander);
  });

  it('returns identical payloads across consecutive reads', async () => {
    await request(app).post('/api/collections').send({
      name: 'Idempotent',
      modelIds: ['m1'],
      groups: [{ name: 'No Id Supplied', modelIds: ['m1'] }],
    });

    const first = await request(app).get('/api/collections');
    const second = await request(app).get('/api/collections');
    expect(JSON.stringify(second.body)).toEqual(JSON.stringify(first.body));
  });
});
