import { Database } from "bun:sqlite"
import os from 'node:os'
import path from 'path'
import { getEnv } from '../util/common-utils'
import * as fs from 'fs'
import { parseJsonText } from "typescript"

const configPath = (): string | undefined => {
    const platform = os.platform()
    if (platform == 'win32') {
        return getEnv('APPDATA')!!
    }
    if (['linux', 'darwin'].includes(platform)) {
        return `${getEnv('HOME')!!}${path.sep}.config`
    }
    console.error(`platform: ${platform} not supported.`);
}



const db = new Database(
    `${configPath()}${path.sep}${getEnv('APP_NAME')}.sqlite`,
    { strict: true }
)

class SqliteTable {
    name!: string
}

const tables = (): SqliteTable[] => {
    return db.query("SELECT name FROM sqlite_master WHERE type='table';").as(SqliteTable).all()
}

export { db, tables }
