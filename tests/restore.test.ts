import { test } from "node:test";
import assert from "node:assert/strict";
import { stageRestore } from "../src/domain/restore.ts";
import { blankProduct } from "../src/domain/catalog.ts";
test("a corrupt referenced photo aborts before replacing catalog or copying files", async () => {
  let applied = false,
    copied = 0;
  await assert.rejects(
    stageRestore(
      {
        version: 1,
        products: [{ ...blankProduct("new"), photoPath: "photos/broken.jpg" }],
      },
      {
        validateImage: async () => {
          throw new Error("Image cannot decode");
        },
        copyImage: async () => {
          copied++;
          return "photos/new.jpg";
        },
        removeImage: async () => {},
      },
      async () => {
        applied = true;
      },
    ),
  );
  assert.equal(applied, false);
  assert.equal(copied, 0);
});
test("failed database restoration cleans up staged photos and retains the original manifest", async () => {
  const removed: string[] = [];
  const manifest = {
    version: 1,
    products: [{ ...blankProduct("new"), photoPath: "photos/source.jpg" }],
  };
  await assert.rejects(
    stageRestore(
      manifest,
      {
        validateImage: async () => {},
        copyImage: async () => "photos/new.jpg",
        removeImage: async (p) => {
          removed.push(p);
        },
      },
      async () => {
        throw new Error("DB failure");
      },
    ),
  );
  assert.deepEqual(removed, ["photos/new.jpg"]);
  assert.equal(manifest.products[0].photoPath, "photos/source.jpg");
});
test("valid photos are checked before replacement and references are rewritten once", async () => {
  const events: string[] = [];
  const count = await stageRestore(
    {
      version: 1,
      products: [
        {
          ...blankProduct("new"),
          photoPath: "photos/source.jpg",
          thumbnailPath: "photos/source.jpg",
        },
      ],
    },
    {
      validateImage: async (path) => {
        events.push(`validate:${path}`);
      },
      copyImage: async (path) => {
        events.push(`copy:${path}`);
        return "photos/new.jpg";
      },
      removeImage: async () => {},
    },
    async (manifest) => {
      events.push("apply");
      assert.equal(manifest.products[0].photoPath, "photos/new.jpg");
      assert.equal(manifest.products[0].thumbnailPath, "photos/new.jpg");
    },
  );
  assert.equal(count, 1);
  assert.deepEqual(events, [
    "validate:photos/source.jpg",
    "copy:photos/source.jpg",
    "apply",
  ]);
});
