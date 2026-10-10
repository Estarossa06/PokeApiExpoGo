
import * as SQLite from 'expo-sqlite';


export interface ProfesorLocal {
    id: number;
    id_remoto: number | null;
    nombre: string;
    foto: string;
    formacion: string;
    profesion: string;
    cargo: string;
    area: string;
    foto_local_uri: string | null;
    sincronizado: number;
}

export const dbPromise = SQLite.openDatabaseAsync('pokeanime.db');

export async function inicializarDB() {
    const db = await dbPromise;

    await db.execAsync(`
    
     CREATE TABLE IF NOT EXISTS profesores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_remoto INTEGER UNIQUE,
      nombre TEXT NOT NULL,
      foto TEXT NOT NULL DEFAULT '',
      formacion TEXT NOT NULL,
      profesion TEXT NOT NULL,
      cargo TEXT NOT NULL,
      area TEXT NOT NULL,
      foto_local_uri TEXT,
      sincronizado INTEGER NOT NULL DEFAULT 1
     );
  `);

    // Migrar bases de datos creadas con la estructura anterior.
    const columnas = await db.getAllAsync<{ name: string }>(
        'PRAGMA table_info(profesores)'
    );

    const tieneIdRemoto = columnas.some(
        (columna) => columna.name === 'id_remoto'
    );

    if (!tieneIdRemoto) {
        await db.execAsync(`
      ALTER TABLE profesores ADD COLUMN id_remoto INTEGER;
    `);

        await db.execAsync(`
      UPDATE profesores SET id_remoto = id WHERE id_remoto IS NULL;
    `);
    }


    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sincronizacion_pendiente (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operacion TEXT NOT NULL,
      profesor_id INTEGER NOT NULL,
      datos TEXT,
      fecha TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

}

export async function obtenerProfesores(): Promise<ProfesorLocal[]> {
    const db = await dbPromise;

    return db.getAllAsync<ProfesorLocal>(
        'SELECT * FROM profesores ORDER BY id'
    );
}


export async function guardarProfesorLocal(
    profesor: Omit<ProfesorLocal, 'sincronizado'>
) {
    const db = await dbPromise;

    await db.runAsync(
        `INSERT INTO profesores
      (id, id_remoto, nombre, foto, formacion, profesion, cargo, area, foto_local_uri, sincronizado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(id) DO UPDATE SET
       id_remoto = excluded.id_remoto,
       nombre = excluded.nombre,
       foto = excluded.foto,
       formacion = excluded.formacion,
       profesion = excluded.profesion,
       cargo = excluded.cargo,
       area = excluded.area,
       foto_local_uri = excluded.foto_local_uri,
       sincronizado = 0`,
        profesor.id,
        profesor.id_remoto,
        profesor.nombre,
        profesor.foto,
        profesor.formacion,
        profesor.profesion,
        profesor.cargo,
        profesor.area,
        profesor.foto_local_uri
    );
}

export async function actualizarProfesorLocal(
    profesor: ProfesorLocal
) {
    await guardarProfesorLocal(profesor);
}

export async function eliminarProfesorLocal(id: number) {
    const db = await dbPromise;

    await db.runAsync(
        'DELETE FROM profesores WHERE id = ?',
        id
    );
}


export type OperacionPendiente = {
    id: number;
    operacion: 'CREATE' | 'UPDATE' | 'DELETE';
    profesor_id: number;
    datos: string | null;
    fecha: string;
};

export async function registrarOperacionPendiente(
    operacion: OperacionPendiente['operacion'],
    profesorId: number,
    datos?: object
) {
    const db = await dbPromise;

    await db.runAsync(
        `INSERT INTO sincronizacion_pendiente
      (operacion, profesor_id, datos)
     VALUES (?, ?, ?)`,
        operacion,
        profesorId,
        datos ? JSON.stringify(datos) : null
    );
}

export async function obtenerOperacionesPendientes(): Promise<OperacionPendiente[]> {
    const db = await dbPromise;

    return db.getAllAsync<OperacionPendiente>(
        'SELECT * FROM sincronizacion_pendiente ORDER BY id'
    );
}

export async function completarOperacionPendiente(id: number) {
    const db = await dbPromise;

    await db.runAsync(
        'DELETE FROM sincronizacion_pendiente WHERE id = ?',
        id
    );
}

export async function marcarProfesorSincronizado(id: number) {
    const db = await dbPromise;

    await db.runAsync(
        'UPDATE profesores SET sincronizado = 1 WHERE id = ?',
        id
    );
}


export async function crearProfesorOffline(
    profesor: Omit<ProfesorLocal, 'id' | 'id_remoto' | 'sincronizado'>
): Promise<number> {
    const db = await dbPromise;

    await db.execAsync('BEGIN TRANSACTION');

    try {
        const resultado = await db.getFirstAsync<{ siguiente: number }>(
            'SELECT MIN(id) - 1 AS siguiente FROM profesores WHERE id < 0'
        );

        const idLocal = resultado?.siguiente ?? -1;

        await db.runAsync(
            `INSERT INTO profesores
        (id, id_remoto, nombre, foto, formacion, profesion, cargo, area, foto_local_uri, sincronizado)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, 0)`,
            idLocal,
            profesor.nombre,
            profesor.foto,
            profesor.formacion,
            profesor.profesion,
            profesor.cargo,
            profesor.area,
            profesor.foto_local_uri
        );

        await registrarOperacionPendiente(
            'CREATE',
            idLocal,
            { ...profesor, id: idLocal }
        );

        await db.execAsync('COMMIT');

        return idLocal;
    } catch (error) {
        await db.execAsync('ROLLBACK');
        throw error;
    }
}

export async function guardarProfesorDescargado(
    profesor: Omit<ProfesorLocal, 'sincronizado' | 'foto_local_uri'>
) {
    const db = await dbPromise;

    await db.runAsync(
        `INSERT INTO profesores
      (id, id_remoto, nombre, foto, formacion, profesion, cargo, area,
       foto_local_uri, sincronizado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 1)
     ON CONFLICT(id) DO UPDATE SET
       id_remoto = excluded.id_remoto,
       nombre = excluded.nombre,
       foto = excluded.foto,
       formacion = excluded.formacion,
       profesion = excluded.profesion,
       cargo = excluded.cargo,
       area = excluded.area
     WHERE profesores.sincronizado = 1`,
        profesor.id,
        profesor.id_remoto,
        profesor.nombre,
        profesor.foto,
        profesor.formacion,
        profesor.profesion,
        profesor.cargo,
        profesor.area
    );
}

export async function actualizarIdRemotoProfesor(
  idLocal: number,
  idRemoto: number
) {
  const db = await dbPromise;

  await db.runAsync(
    `UPDATE profesores
     SET id_remoto = ?, sincronizado = 1
     WHERE id = ?`,
    idRemoto,
    idLocal
  );
}