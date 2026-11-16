import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { CatalogRepository } from '../src/data/repository.ts';
import { blankProduct } from '../src/domain/catalog.ts';
import type { SqlDatabase, SqlValue } from '../src/data/repository.ts';

function setup() {
  const db = new DatabaseSync(':memory:');
  const adapter: SqlDatabase = {
    exec: async sql => { db.exec(sql); },
    run: async (sql, params = []) => { db.prepare(sql).run(...params); },
    all: async <T>(sql: string, params: SqlValue[] = []) => db.prepare(sql).all(...params) as T[],
  };
  return new CatalogRepository(adapter);
}
test('SQLite imports update Adidas without overwriting Nike, photo, price or unpictured rows', async () => {
  const repo = setup(); await repo.init();
  await repo.save({ ...blankProduct('64.10'), brand: 'Adidas', priceCents: 3500, availableSizes: [37, 46], availabilityKnown: true });
  await repo.save({ ...blankProduct('71.10'), brand: 'Nike', priceCents: 3500, availableSizes: [36], availabilityKnown: true });
  await repo.applyImport([], [{ code: '64.10', brand: 'Adidas', baseSize: 37, mark: 'half', reviewed: true }], []);
  const products = await repo.list();
  assert.deepEqual(products.find(p => p.code === '64.10')?.availableSizes, [37.5, 46]);
  assert.equal(products.find(p => p.code === '64.10')?.priceCents, 3500);
  assert.deepEqual(products.find(p => p.code === '71.10')?.availableSizes, [36]);
});
test('a failed multi-product transaction restores all old products', async () => {
  const repo = setup(); await repo.init();
  await repo.save({ ...blankProduct('1'), brand: 'Nike' });
  await assert.rejects(repo.applyImport([{ code: '1', brand: 'Adidas' }, { code: '2', priceCents: -1 }], [], []));
  const products = await repo.list();
  assert.equal(products.length, 1);
  assert.equal(products[0].brand, 'Nike');
});
test('conflicting drafts do not modify the catalog', async () => {
  const repo = setup(); await repo.init();
  await assert.rejects(repo.applyImport([{code:'1',priceCents:100},{code:'1',priceCents:200}], [], []));
  assert.equal((await repo.list()).length, 0);
});
test('backup restoration replaces catalog only after full validation', async () => {
  const repo = setup(); await repo.init(); await repo.save(blankProduct('old'));
  await assert.rejects(repo.restore({version:1,products:[{...blankProduct('bad'),priceCents:-1}]}));
  assert.equal((await repo.list())[0].code, 'old');
  await repo.restore({version:1,products:[blankProduct('new')]});
  assert.deepEqual((await repo.list()).map(p=>p.code), ['new']);
});
test('500 products persist and exact-size filtering stays correct', async () => {
  const repo = setup(); await repo.init();
  await repo.restore({version:1,products:Array.from({length:500},(_,i)=>({...blankProduct(String(i)),availableSizes:[i%2?36:36.5],availabilityKnown:true}))});
  const all = await repo.list();
  assert.equal(all.length,500);
  assert.equal(all.filter(p=>p.availableSizes.includes(36)).length,250);
});
