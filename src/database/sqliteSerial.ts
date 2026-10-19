export interface AsyncSQLiteRunDatabase {
  runAsync(sql: string, ...params: unknown[]): Promise<unknown>;
}

/** Reuses a database runtime across Fast Refresh module evaluations. */
export function getOrCreateSQLiteRuntime<T>(
  root: Record<string, unknown>,
  key: string,
  create: () => T
): T {
  if (!Object.prototype.hasOwnProperty.call(root, key)) {
    root[key] = create();
  }
  return root[key] as T;
}

/** Runs database tasks in order and keeps the queue usable after a rejection. */
export function createSQLiteTaskQueue() {
  let tail: Promise<void> = Promise.resolve();

  return function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = tail.then(task, task);
    tail = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  };
}

export async function deleteMissingSynchronizedProfessors(
  db: AsyncSQLiteRunDatabase,
  existingRemoteIds: number[]
): Promise<void> {
  if (existingRemoteIds.length === 0) {
    await db.runAsync(
      `DELETE FROM profesores
       WHERE sincronizado = 1
         AND id_remoto IS NOT NULL`
    );
    return;
  }

  const placeholders = existingRemoteIds.map(() => '?').join(', ');
  await db.runAsync(
    `DELETE FROM profesores
     WHERE sincronizado = 1
       AND id_remoto IS NOT NULL
       AND id_remoto NOT IN (${placeholders})`,
    ...existingRemoteIds
  );
}
