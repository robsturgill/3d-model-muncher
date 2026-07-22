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
      modelIds: ['loose-1'],
      groups: [
        { name: 'Dragon Model', modelIds: ['m1', 'm2', 'm1'] },
        { name: 'Second Group', modelIds: ['m2', 'm3'] },
      ],
    });

    expect(create.status).toBe(200);
    expect(create.body.collection.modelIds).toEqual(['loose-1', 'm1', 'm2', 'm3']);
    expect(create.body.collection.groups).toHaveLength(2);
    expect(create.body.collection.groups[0].modelIds).toEqual(['m1', 'm2']);
    expect(create.body.collection.groups[1].modelIds).toEqual(['m3']);

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
});
