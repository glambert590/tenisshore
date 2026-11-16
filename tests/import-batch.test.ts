import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { CatalogRepository, type SqlValue } from "../src/data/repository.ts";
import {
  pickAndImportImages,
  type ImageImportPorts,
} from "../src/domain/importBatch.ts";

function setup(count: number, canceled = false) {
  const db = new DatabaseSync(":memory:");
  const repo = new CatalogRepository({
    exec: async (sql) => {
      db.exec(sql);
    },
    run: async (sql, params = []) => {
      db.prepare(sql).run(...params);
    },
    all: async <T>(sql: string, params: SqlValue[] = []) =>
      db.prepare(sql).all(...params) as T[],
  });
  let ids = 0,
    inFlight = 0,
    maxInFlight = 0;
  const ports: ImageImportPorts = {
    pick: async (options) => {
      assert.equal(options.allowsMultipleSelection, true);
      assert.equal(options.allowsEditing, false);
      assert.equal(options.selectionLimit, 0);
      return {
        canceled,
        assets: canceled
          ? null
          : Array.from({ length: count }, (_, i) => ({
              uri: `file://shoe-${i}`,
              width: 800,
              height: 1000,
            })),
      };
    },
    keepImage: async (image) => image.uri,
    recognize: async (uri) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight--;
      return {
        width: 800,
        height: 1000,
        elapsedMs: 1,
        tokens: [
          {
            text: `CÓDIGO 71.${uri.split("-").pop()} 35USD`,
            x: 10,
            y: 10,
            width: 200,
            height: 30,
          },
        ],
      };
    },
    makeId: () => `draft-${++ids}`,
    saveDraft: (draft) => repo.saveDraft(draft),
    onDraft: () => {},
    onProgress: () => {},
  };
  return { repo, ports, maxInFlight: () => maxInFlight };
}

test("selecting more than 30 model photos saves a separate persistent draft for every photo", async () => {
  const { repo, ports, maxInFlight } = setup(40);
  await repo.init();
  const result = await pickAndImportImages("card", ports);
  const drafts = await repo.listDrafts();
  assert.equal(result.imported, 40);
  assert.deepEqual(result.errors, []);
  assert.equal(drafts.length, 40);
  assert.equal(new Set(drafts.map((d) => d.patch.code)).size, 40);
  assert.ok(drafts.some((d) => d.patch.code === "71.10"));
  assert.ok(drafts.every((d) => !d.reviewed && d.kind === "card"));
  assert.equal(maxInFlight(), 1);
});

test("a failed photo does not discard other selected models", async () => {
  const { repo, ports } = setup(4);
  await repo.init();
  const recognize = ports.recognize;
  ports.recognize = async (uri) => {
    if (uri.endsWith("-1")) throw new Error("Imagen ilegible");
    return recognize(uri);
  };
  const result = await pickAndImportImages("card", ports);
  assert.equal(result.imported, 3);
  assert.equal((await repo.listDrafts()).length, 3);
  assert.match(result.errors[0], /Imagen 2: Imagen ilegible/);
});

test("canceling batch selection leaves existing drafts intact", async () => {
  const { repo, ports } = setup(2);
  await repo.init();
  await pickAndImportImages("card", ports);
  ports.pick = async () => ({ canceled: true, assets: null });
  const result = await pickAndImportImages("card", ports);
  assert.equal(result.imported, 0);
  assert.equal((await repo.listDrafts()).length, 2);
});
