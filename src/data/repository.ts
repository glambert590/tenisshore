import {
  applyRows,
  blankProduct,
  normalizeCode,
  reviewIssues,
  validateBackup,
  validateProduct,
} from "../domain/catalog.ts";
import type {
  AvailabilityRow,
  ImportDraft,
  Product,
  ProductPatch,
} from "../domain/types.ts";

export type SqlValue = string | number | null;
export interface SqlDatabase {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<void>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
}

export class CatalogRepository {
  private db: SqlDatabase;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(db: SqlDatabase) {
    this.db = db;
  }
  private exclusive<T>(work: () => Promise<T>): Promise<T> {
    const next = this.queue.then(work, work);
    this.queue = next.catch(() => undefined);
    return next;
  }
  private async transaction(work: () => Promise<void>): Promise<void> {
    await this.db.exec("BEGIN IMMEDIATE");
    try {
      await work();
      await this.db.exec("COMMIT");
    } catch (error) {
      await this.db.exec("ROLLBACK");
      throw error;
    }
  }
  init(): Promise<void> {
    return this.exclusive(async () => {
      const versions = await this.db.all<{ user_version: number }>(
        "PRAGMA user_version",
      );
      if (versions[0]?.user_version > 1)
        throw new Error(
          "La base de datos necesita una versión más reciente de la app.",
        );
      await this.db.exec("PRAGMA journal_mode = WAL");
      await this.transaction(async () => {
        await this.db.exec(
          "CREATE TABLE IF NOT EXISTS products (code TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS drafts (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL); PRAGMA user_version = 1;",
        );
      });
    });
  }
  private async load(): Promise<Product[]> {
    return (
      await this.db.all<{ payload: string }>(
        "SELECT payload FROM products ORDER BY code",
      )
    ).map((r) => JSON.parse(r.payload) as Product);
  }
  list(): Promise<Product[]> {
    return this.exclusive(() => this.load());
  }
  private async put(product: Product): Promise<void> {
    validateProduct(product);
    await this.db.run(
      "INSERT INTO products(code, payload) VALUES (?, ?) ON CONFLICT(code) DO UPDATE SET payload = excluded.payload",
      [product.code, JSON.stringify(product)],
    );
  }
  save(product: Product): Promise<void> {
    return this.exclusive(() => this.transaction(() => this.put(product)));
  }
  saveDraft(draft: ImportDraft): Promise<void> {
    return this.exclusive(() =>
      this.db.run(
        "INSERT INTO drafts(id, payload) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload",
        [draft.id, JSON.stringify(draft)],
      ),
    );
  }
  listDrafts(): Promise<ImportDraft[]> {
    return this.exclusive(async () =>
      (
        await this.db.all<{ payload: string }>(
          "SELECT payload FROM drafts ORDER BY id",
        )
      ).map((r) => JSON.parse(r.payload) as ImportDraft),
    );
  }
  deleteDraft(id: string): Promise<void> {
    return this.exclusive(() =>
      this.db.run("DELETE FROM drafts WHERE id = ?", [id]),
    );
  }
  applyImport(
    patches: ProductPatch[],
    rows: AvailabilityRow[],
    draftIds: string[],
  ): Promise<void> {
    return this.exclusive(async () => {
      const normalizedRows = rows.map((r) => ({
        ...r,
        code: normalizeCode(r.code),
      }));
      const issues = reviewIssues(normalizedRows);
      if (issues.length) throw new Error(issues.join("\n"));
      const changes = new Map<string, ProductPatch>();
      for (const patch of patches) {
        const code = normalizeCode(patch.code),
          previous = changes.get(code);
        for (const key of [
          "brand",
          "priceCents",
          "photoPath",
          "thumbnailPath",
        ] as const) {
          if (
            previous?.[key] !== undefined &&
            patch[key] !== undefined &&
            previous[key] !== patch[key]
          )
            throw new Error(
              `Hay dos fichas con datos distintos para ${code}. Conserva una o corrige ambas.`,
            );
        }
        changes.set(code, { ...previous, ...patch, code });
      }
      await this.transaction(async () => {
        const products = new Map((await this.load()).map((p) => [p.code, p]));
        const codes = new Set([
          ...changes.keys(),
          ...normalizedRows.map((r) => r.code),
        ]);
        for (const code of codes) {
          let p = products.get(code) ?? blankProduct(code);
          const patch = changes.get(code);
          if (patch)
            p = {
              ...p,
              ...Object.fromEntries(
                Object.entries(patch).filter(
                  ([, value]) => value !== undefined,
                ),
              ),
            };
          const ownRows = normalizedRows.filter((r) => r.code === code);
          const brands = new Set(
            ownRows.map((r) => r.brand?.trim()).filter(Boolean),
          );
          if (patch?.brand) brands.add(patch.brand.trim());
          if (brands.size > 1)
            throw new Error(`Hay marcas contradictorias para ${code}.`);
          if (brands.size) p = { ...p, brand: [...brands][0] ?? null };
          p = applyRows(p, ownRows, new Date().toISOString());
          await this.put(p);
        }
        for (const id of draftIds)
          await this.db.run("DELETE FROM drafts WHERE id = ?", [id]);
      });
    });
  }
  restore(manifest: unknown): Promise<void> {
    return this.exclusive(async () => {
      const validated = validateBackup(manifest);
      await this.transaction(async () => {
        await this.db.exec("DELETE FROM products; DELETE FROM drafts;");
        for (const p of validated.products) await this.put(p);
      });
    });
  }
}
