import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  createSQLiteTaskQueue,
  deleteMissingSynchronizedProfessors,
  getOrCreateSQLiteRuntime,
} from '../src/database/sqliteSerial.ts';

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

test('reuses the same database runtime across module reloads', () => {
  const root = {};
  let openedConnections = 0;
  const createRuntime = () => getOrCreateSQLiteRuntime(
    root,
    '__profesoresSQLiteRuntime__',
    () => ({ connection: ++openedConnections, queue: createSQLiteTaskQueue() })
  );

  const firstModuleRuntime = createRuntime();
  const refreshedModuleRuntime = createRuntime();

  assert.equal(refreshedModuleRuntime, firstModuleRuntime);
  assert.equal(openedConnections, 1);
});

test('serializes overlapping cloud sync and absent-record deletion tasks', async () => {
  const enqueue = createSQLiteTaskQueue();
  let active = 0;
  let maximumActive = 0;
  const run = (name) => enqueue(async () => {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await delay(10);
    active -= 1;
    return name;
  });

  const results = await Promise.all([run('cloud-sync'), run('delete-absent')]);

  assert.deepEqual(results, ['cloud-sync', 'delete-absent']);
  assert.equal(maximumActive, 1);
});

test('serializes reads and writes using one database task queue', async () => {
  const enqueue = createSQLiteTaskQueue();
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE items (id INTEGER PRIMARY KEY, value TEXT)');
  const events = [];

  try {
    const query = enqueue(async () => {
      events.push('read-start');
      await delay(10);
      const count = db.prepare('SELECT COUNT(*) AS count FROM items').get().count;
      events.push('read-end');
      return count;
    });
    const write = enqueue(async () => {
      events.push('write-start');
      db.prepare('INSERT INTO items (value) VALUES (?)').run('offline');
      events.push('write-end');
    });

    assert.equal(await query, 0);
    await write;
    assert.deepEqual(events, ['read-start', 'read-end', 'write-start', 'write-end']);
  } finally {
    db.close();
  }
});

test('deletes absent synchronized professors while preserving local pending rows', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE profesores (
    id INTEGER PRIMARY KEY,
    id_remoto INTEGER,
    sincronizado INTEGER NOT NULL
  )`);
  db.prepare('INSERT INTO profesores VALUES (?, ?, ?)').run(1, 10, 1);
  db.prepare('INSERT INTO profesores VALUES (?, ?, ?)').run(2, 20, 1);
  db.prepare('INSERT INTO profesores VALUES (?, ?, ?)').run(3, null, 0);

  try {
    const asyncDb = {
      runAsync: async (sql, ...params) => db.prepare(sql).run(...params),
    };
    await deleteMissingSynchronizedProfessors(asyncDb, [10]);

    assert.deepEqual(
      db.prepare('SELECT id, id_remoto FROM profesores ORDER BY id').all()
        .map((row) => ({ ...row })),
      [{ id: 1, id_remoto: 10 }, { id: 3, id_remoto: null }]
    );

    await deleteMissingSynchronizedProfessors(asyncDb, []);
    assert.deepEqual(
      db.prepare('SELECT id FROM profesores ORDER BY id').all()
        .map((row) => ({ ...row })),
      [{ id: 3 }]
    );
  } finally {
    db.close();
  }
});

test('propagates a database lock error and allows queued operations to recover', async () => {
  const enqueue = createSQLiteTaskQueue();
  const lockError = new Error('SQLiteErrorException: database is locked');

  await assert.rejects(enqueue(async () => { throw lockError; }), (error) => error === lockError);
  assert.equal(await enqueue(async () => 'recovered'), 'recovered');
});

test('recovers after a real SQLITE_BUSY from another SQLite connection', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'profesores-sqlite-lock-'));
  const filename = join(directory, 'lock-test.db');
  const lockingConnection = new DatabaseSync(filename);
  const appConnection = new DatabaseSync(filename);
  const enqueue = createSQLiteTaskQueue();

  try {
    lockingConnection.exec('CREATE TABLE items (id INTEGER PRIMARY KEY, value TEXT)');
    appConnection.exec('PRAGMA busy_timeout = 0');
    lockingConnection.exec('BEGIN IMMEDIATE');

    await assert.rejects(
      enqueue(async () => appConnection.prepare('INSERT INTO items (value) VALUES (?)').run('blocked')),
      /database is locked/i
    );

    lockingConnection.exec('ROLLBACK');
    await enqueue(async () => appConnection.prepare('INSERT INTO items (value) VALUES (?)').run('recovered'));
    assert.equal(appConnection.prepare('SELECT COUNT(*) AS count FROM items').get().count, 1);
  } finally {
    if (lockingConnection.isTransaction) lockingConnection.exec('ROLLBACK');
    appConnection.close();
    lockingConnection.close();
    unlinkSync(filename);
    rmdirSync(directory);
  }
});

test('rolls back a failed serialized transaction before the next database task', async () => {
  const enqueue = createSQLiteTaskQueue();
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE items (id INTEGER PRIMARY KEY, value TEXT)');

  try {
    await assert.rejects(enqueue(async () => {
      db.exec('BEGIN');
      try {
        db.prepare('INSERT INTO items (value) VALUES (?)').run('temporary');
        throw new Error('simulated transaction failure');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    }), /simulated transaction failure/);

    assert.equal(db.isTransaction, false);
    assert.equal(await enqueue(async () => db.prepare('SELECT COUNT(*) AS count FROM items').get().count), 0);
  } finally {
    db.close();
  }
});
