// In-memory MongoDB stand-in for integration tests. Implements only the
// query shapes the routes actually use — adding more selectors here is fine
// but YAGNI for now.

type Doc = Record<string, unknown>;

function matchesValue(actual: unknown, expected: unknown): boolean {
  if (
    expected &&
    typeof expected === "object" &&
    !Array.isArray(expected) &&
    "$in" in (expected as Record<string, unknown>)
  ) {
    const arr = (expected as { $in: unknown[] }).$in;
    return Array.isArray(arr) && arr.includes(actual);
  }
  return actual === expected;
}

function matchesFilter(doc: Doc, filter: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(filter)) {
    if (key === "$expr") {
      // Only handle the specific shape used by join: { $lt: [{ $size: '$members' }, N] }
      const expr = value as { $lt?: [{ $size?: string }, number] };
      if (expr.$lt) {
        const [left, right] = expr.$lt;
        if (left?.$size) {
          const path = left.$size.replace(/^\$/, "");
          const arr = doc[path];
          if (!Array.isArray(arr) || arr.length >= right) return false;
        }
      }
      continue;
    }
    // Handle "members: studentId" → matches if doc.members (array) contains studentId
    const actual = doc[key];
    if (Array.isArray(actual) && typeof value === "string") {
      if (!actual.includes(value)) return false;
      continue;
    }
    if (!matchesValue(actual, value)) return false;
  }
  return true;
}

function project<T extends Doc>(doc: T, projection: Record<string, 0 | 1>): T {
  const includes = Object.values(projection).some((v) => v === 1);
  const excludes = Object.values(projection).some((v) => v === 0);
  const out = {} as Doc;
  for (const [k, v] of Object.entries(doc)) {
    if (includes) {
      if (projection[k] === 1) out[k] = v;
    } else if (excludes) {
      if (projection[k] !== 0) out[k] = v;
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

interface UpdateResult {
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
}

interface DeleteResult {
  deletedCount: number;
}

class FakeCollection {
  docs: Doc[] = [];
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  async findOne(
    filter: Record<string, unknown>,
    options?: { projection?: Record<string, 0 | 1> },
  ): Promise<Doc | null> {
    const match = this.docs.find((d) => matchesFilter(d, filter));
    if (!match) return null;
    return options?.projection
      ? project({ ...match }, options.projection)
      : { ...match };
  }

  find(filter: Record<string, unknown>): {
    project<T = Doc>(p: Record<string, 0 | 1>): { toArray(): Promise<T[]> };
  } {
    const matches = this.docs.filter((d) => matchesFilter(d, filter));
    return {
      project<T = Doc>(p: Record<string, 0 | 1>) {
        return {
          async toArray(): Promise<T[]> {
            return matches.map((d) => project({ ...d }, p) as T);
          },
        };
      },
    };
  }

  async insertOne(doc: Doc): Promise<{ insertedId: string }> {
    if (this.name === "groups" && typeof doc.code === "string") {
      if (this.docs.some((d) => d.code === doc.code)) {
        const err = new Error("duplicate key") as Error & { code: number };
        err.code = 11000;
        throw err;
      }
    }
    this.docs.push({ ...doc });
    return { insertedId: String(this.docs.length) };
  }

  async updateOne(
    filter: Record<string, unknown>,
    update: {
      $set?: Doc;
      $setOnInsert?: Doc;
      $addToSet?: Record<string, unknown>;
    },
    options?: { upsert?: boolean },
  ): Promise<UpdateResult> {
    const idx = this.docs.findIndex((d) => matchesFilter(d, filter));
    if (idx === -1) {
      if (options?.upsert) {
        const base: Doc = {};
        // copy only top-level scalar keys from filter (not $expr/operators)
        for (const [k, v] of Object.entries(filter)) {
          if (!k.startsWith("$")) base[k] = v;
        }
        const newDoc: Doc = {
          ...base,
          ...(update.$setOnInsert || {}),
          ...(update.$set || {}),
        };
        this.docs.push(newDoc);
        return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
      }
      return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
    }
    const doc = this.docs[idx];
    if (update.$set) Object.assign(doc, update.$set);
    if (update.$addToSet) {
      for (const [k, v] of Object.entries(update.$addToSet)) {
        const cur = doc[k];
        const arr = Array.isArray(cur) ? cur : [];
        if (!arr.includes(v)) arr.push(v);
        doc[k] = arr;
      }
    }
    return { matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
  }

  async deleteOne(filter: Record<string, unknown>): Promise<DeleteResult> {
    const idx = this.docs.findIndex((d) => matchesFilter(d, filter));
    if (idx === -1) return { deletedCount: 0 };
    this.docs.splice(idx, 1);
    return { deletedCount: 1 };
  }

  async createIndex(): Promise<string> {
    return "idx";
  }
}

export class FakeDb {
  collections = new Map<string, FakeCollection>();

  collection(name: string): FakeCollection {
    let c = this.collections.get(name);
    if (!c) {
      c = new FakeCollection(name);
      this.collections.set(name, c);
    }
    return c;
  }
}
