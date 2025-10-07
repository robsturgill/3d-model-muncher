import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { describe, it, expect, beforeEach } from 'vitest';
import app from '../../server';

function resetCollections() {
  const p = path.join(process.cwd(), 'data', 'collections.json');
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
});
