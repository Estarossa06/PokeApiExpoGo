
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
    nuevo_remoto?: number;
    nuevo_visto?: number;
    fecha_detectado?: string | null;
}

export type IntervaloMonitoreo = 2 | 10 | 30;

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
      sincronizado INTEGER NOT NULL DEFAULT 1,
      nuevo_remoto INTEGER NOT NULL DEFAULT 0,
      nuevo_visto INTEGER NOT NULL DEFAULT 0,
      fecha_detectado TEXT
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

    // Columnas para conservar el historial de docentes detectados en la nube.
    const tieneNuevoRemoto = columnas.some(
        (columna) => columna.name === 'nuevo_remoto'
    );
    if (!tieneNuevoRemoto) {
        await db.execAsync(
            'ALTER TABLE profesores ADD COLUMN nuevo_remoto INTEGER NOT NULL DEFAULT 0'
        );
    }

    const tieneNuevoVisto = columnas.some(
        (columna) => columna.name === 'nuevo_visto'
    );
    if (!tieneNuevoVisto) {
        await db.execAsync(
            'ALTER TABLE profesores ADD COLUMN nuevo_visto INTEGER NOT NULL DEFAULT 0'
        );
    }

    const tieneFechaDetectado = columnas.some(
        (columna) => columna.name === 'fecha_detectado'
    );
    if (!tieneFechaDetectado) {
        await db.execAsync(
            'ALTER TABLE profesores ADD COLUMN fecha_detectado TEXT'
        );
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

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS preferencias_app (
      clave TEXT PRIMARY KEY NOT NULL,
      valor TEXT NOT NULL
    );
  `);

}

// Persistencia del intervalo: conserva la selección del usuario entre reinicios.
export async function obtenerIntervaloMonitoreo(): Promise<IntervaloMonitoreo> {
    const db = await dbPromise;
    const preferencia = await db.getFirstAsync<{ valor: string }>(
        'SELECT valor FROM preferencias_app WHERE clave = ?',
        'intervalo_monitoreo'
    );
    const valor = Number(preferencia?.valor);

    return valor === 2 || valor === 10 || valor === 30 ? valor : 10;
}

export async function guardarIntervaloMonitoreo(
    segundos: IntervaloMonitoreo
): Promise<void> {
    const db = await dbPromise;
    await db.runAsync(
        `INSERT INTO preferencias_app (clave, valor)
         VALUES (?, ?)
         ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`,
        'intervalo_monitoreo',
        String(segundos)
    );
}

export async function obtenerProfesores(): Promise<ProfesorLocal[]> {
    const db = await dbPromise;

    return db.getAllAsync<ProfesorLocal>(
        'SELECT * FROM profesores ORDER BY id'
    );
}

export async function obtenerDocentesRecientes(): Promise<ProfesorLocal[]> {
    const db = await dbPromise;
    return db.getAllAsync<ProfesorLocal>(
        `SELECT * FROM profesores
         WHERE nuevo_remoto = 1
         ORDER BY datetime(fecha_detectado) DESC, id DESC`
    );
}

/**
 * Elimina de SQLite los registros sincronizados que ya no están en la nube.
 * Conserva las filas con cambios locales pendientes.
 */
export async function eliminarProfesoresSincronizadosAusentes(
    idsRemotosExistentes: number[]
): Promise<void> {
    const db = await dbPromise;

    if (idsRemotosExistentes.length === 0) {
        await db.runAsync(
            `DELETE FROM profesores
             WHERE sincronizado = 1
               AND id_remoto IS NOT NULL`
        );
        return;
    }

    const placeholders = idsRemotosExistentes.map(() => '?').join(', ');
    await db.runAsync(
        `DELETE FROM profesores
         WHERE sincronizado = 1
           AND id_remoto IS NOT NULL
           AND id_remoto NOT IN (${placeholders})`,
        ...idsRemotosExistentes
    );
}

/**
 * Guarda solo docentes que todavía no existen localmente por su ID remoto.
 * Devuelve true cuando la inserción remota se detecta por primera vez.
 */
/** Marca como reciente una creación local que acaba de sincronizarse.
 * Se invoca desde el sondeo, no en el momento de la creación.
 */
export async function marcarDocenteComoReciente(idRemoto: number): Promise<void> {
    const db = await dbPromise;
    await db.runAsync(
        `UPDATE profesores
         SET nuevo_remoto = 1, fecha_detectado = CURRENT_TIMESTAMP
         WHERE id_remoto = ?`,
        idRemoto
    );
}

export async function marcarDocenteNuevoComoVisto(idRemoto: number): Promise<void> {
    const db = await dbPromise;
    await db.runAsync(
        'UPDATE profesores SET nuevo_visto = 1 WHERE id_remoto = ?',
        idRemoto
    );
}

export async function guardarDocenteDetectadoEnNube(
    profesor: Omit<ProfesorLocal, 'sincronizado' | 'foto_local_uri' | 'nuevo_remoto' | 'fecha_detectado'>
): Promise<boolean> {
    const db = await dbPromise;
    const existente = await db.getFirstAsync<{
        id: number;
        sincronizado: number;
    }>(
        'SELECT id, sincronizado FROM profesores WHERE id_remoto = ? LIMIT 1',
        profesor.id_remoto
    );

    if (existente) {
        // Atlas es la fuente para filas sincronizadas; una edición offline pendiente
        // conserva prioridad local hasta que su operación se resuelva.
        if (existente.sincronizado === 1) {
            await db.runAsync(
                `UPDATE profesores
                 SET id_remoto = ?, nombre = ?, foto = ?, formacion = ?,
                     profesion = ?, cargo = ?, area = ?, foto_local_uri = NULL
                 WHERE id = ? AND sincronizado = 1`,
                profesor.id_remoto,
                profesor.nombre,
                profesor.foto,
                profesor.formacion,
                profesor.profesion,
                profesor.cargo,
                profesor.area,
                existente.id
            );
        }
        return false;
    }

    // `id` es la clave local de SQLite y `id_remoto` identifica MongoDB.
    // No reutilizamos el ID remoto como clave local: podría colisionar con
    // una fila local antigua aunque ese ID ya no exista en la nube.
    await db.runAsync(
        `INSERT INTO profesores
         (id_remoto, nombre, foto, formacion, profesion, cargo, area,
          foto_local_uri, sincronizado, nuevo_remoto, fecha_detectado)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 1, 1, CURRENT_TIMESTAMP)`,
        profesor.id_remoto,
        profesor.nombre,
        profesor.foto,
        profesor.formacion,
        profesor.profesion,
        profesor.cargo,
        profesor.area
    );
    return true;
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

export async function vincularProfesorConRemoto(
    idLocal: number,
    profesorRemoto: Pick<
        ProfesorLocal,
        'id' | 'nombre' | 'foto' | 'formacion' | 'profesion' | 'cargo' | 'area'
    >,
    marcarReciente = false
): Promise<void> {
    const db = await dbPromise;

    await db.execAsync('BEGIN TRANSACTION');

    try {
        const duplicado = await db.getFirstAsync<{
            id: number;
            nuevo_remoto: number;
            fecha_detectado: string | null;
        }>(
            `SELECT id, nuevo_remoto, fecha_detectado
             FROM profesores
             WHERE id_remoto = ? AND id != ?
             LIMIT 1`,
            profesorRemoto.id,
            idLocal
        );

        if (duplicado) {
            await db.runAsync(
                `UPDATE profesores
                 SET nuevo_remoto = CASE
                     WHEN ? = 1 THEN 1
                     ELSE nuevo_remoto
                 END,
                 fecha_detectado = COALESCE(
                     fecha_detectado, ?
                 )
                 WHERE id = ?`,
                duplicado.nuevo_remoto,
                duplicado.fecha_detectado,
                idLocal
            );

            await db.runAsync(
                'DELETE FROM profesores WHERE id = ?',
                duplicado.id
            );
        }

        await db.runAsync(
            `UPDATE profesores
                 SET id_remoto = ?, nombre = ?, foto = ?, formacion = ?,
                     profesion = ?, cargo = ?, area = ?, sincronizado = 1,
                     nuevo_remoto = CASE WHEN ? = 1 THEN 1 ELSE nuevo_remoto END,
                     fecha_detectado = CASE
                         WHEN ? = 1 THEN COALESCE(fecha_detectado, CURRENT_TIMESTAMP)
                         ELSE fecha_detectado
                     END
             WHERE id = ?`,
            profesorRemoto.id,
            profesorRemoto.nombre,
            profesorRemoto.foto,
            profesorRemoto.formacion,
            profesorRemoto.profesion,
            profesorRemoto.cargo,
            profesorRemoto.area,
            marcarReciente ? 1 : 0,
            marcarReciente ? 1 : 0,
            idLocal
        );

        await db.execAsync('COMMIT');
    } catch (error) {
        await db.execAsync('ROLLBACK');
        throw error;
    }
}
export async function actualizarFotoPendiente(
  operacionId: number,
  profesorId: number,
  fotoUrl: string
) {
  const db = await dbPromise;

  await db.runAsync(
    `UPDATE profesores
     SET foto = ?, foto_local_uri = NULL
     WHERE id = ?`,
    fotoUrl,
    profesorId
  );

  const operacion = await db.getFirstAsync<{ datos: string | null }>(
    `SELECT datos
     FROM sincronizacion_pendiente
     WHERE id = ?`,
    operacionId
  );

  if (operacion?.datos) {
    const datos = JSON.parse(operacion.datos);
    datos.foto = fotoUrl;

    await db.runAsync(
      `UPDATE sincronizacion_pendiente
       SET datos = ?
       WHERE id = ?`,
      JSON.stringify(datos),
      operacionId
    );
  }
}
