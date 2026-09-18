/** In-memory server adapter for fault-injection tests, not used by the application. */
export type TestRow = Record<string, unknown> & { id: string };
export type TestRequest = { table: string; action: string; columns?: string; payload?: TestRow; filters: [string, unknown][] };
export class JournalSafetyDb {
  rows = new Map<string, TestRow[]>();
  calls: TestRequest[] = [];
  userId = "owner";
  fail: ((request: TestRequest) => Error | null) | null = null;
  after: ((request: TestRequest) => Error | null) | null = null;
  from = (table: string) => {
    const request: TestRequest = { table, action: "select", filters: [] };
    let single = false;
    let ids: string[] | undefined;
    const execute = async () => {
      this.calls.push({ ...request, filters: [...request.filters] });
      const failure = this.fail?.(request); if (failure) return { data: null, error: failure };
      const rows = this.rows.get(table) ?? [];
      const matches = (row: TestRow) => request.filters.every(([key, value]) => row[key] === value) && (!ids || ids.includes(row.id));
      let selected = rows.filter(matches);
      if (request.action === "upsert" || request.action === "insert") {
        const existing = rows.find((row) => row.id === request.payload?.id);
        if (!existing && request.payload) rows.push(request.payload);
        this.rows.set(table, rows); selected = existing ? [] : request.payload ? [request.payload] : [];
      } else if (request.action === "delete") this.rows.set(table, rows.filter((row) => !matches(row)));
      else if (request.action === "update") {
        selected = selected.map((row) => Object.assign(row, request.payload));
      }
      const after = this.after?.(request); if (after) return { data: null, error: after };
      return { data: single ? selected[0] ?? null : selected, error: null };
    };
    const query = {
      select: (columns?: string) => { request.columns = columns; return query; },
      eq: (key: string, value: unknown) => { request.filters.push([key, value]); return query; },
      in: (_key: string, values: string[]) => { ids = values; return query; },
      order: () => query,
      delete: () => { request.action = "delete"; return query; },
      insert: (row: TestRow) => { request.action = "insert"; request.payload = row; return query; },
      upsert: (row: TestRow) => { request.action = "upsert"; request.payload = row; return query; },
      update: (row: TestRow) => { request.action = "update"; request.payload = row; return query; },
      maybeSingle: () => { single = true; return query; },
      single: () => { single = true; return query; },
      then: (yes: (value: Awaited<ReturnType<typeof execute>>) => unknown, no?: (error: unknown) => unknown) => execute().then(yes, no),
    };
    return query;
  };
}
