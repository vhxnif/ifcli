/* eslint-disable @typescript-eslint/no-explicit-any */
import os from 'node:os'
import { isEmpty } from './common-utils'

const platform = os.platform()

const tmpPath = os.tmpdir

const terminal: Record<string, number> = {
    column: process.stdout.columns,
    row: process.stdout.rows,
}

const envKeyPrefix = '$env.'

const env = (key: string): string | undefined => {
    return process.env[`${key}`]
}

const isEnvKey = (str: string): boolean => {
    if (!str) {
        return false
    }
    return str.startsWith(envKeyPrefix)
}

const arrEach = (
    arr: any[],
    objEach: (obj: any, f: (str: string) => string) => void,
    f: (str: string) => string
): any[] => {
    return arr.map((a) => {
        if (typeof a === 'string') {
            return f(a)
        }
        if (typeof a === 'object') {
            if (Array.isArray(a)) {
                return arrEach(a, objEach, f)
            }
            objEach(a, f)
        }
        return a
    })
}

const objEach = (
    obj: any,
    f: (str: string) => string,
    visited = new WeakSet()
): void => {
    if (visited.has(obj)) {
        return
    }
    visited.add(obj)
    for (const it of Object.entries(obj)) {
        const [key, value] = it
        if (typeof value === 'string') {
            obj[key] = f(value)
            continue
        }
        if (typeof value === 'object') {
            if (Array.isArray(value)) {
                obj[key] = arrEach(value, objEach, f)
                continue
            }
            objEach(value, f)
            continue
        }
    }
}

const objEnvKeyProcess = (
    str: string,
    f: (key: string, envValue: string | undefined) => string
): string => {
    if (!isEnvKey(str)) {
        return str
    }
    const key = str.replace(envKeyPrefix, '')
    const value = env(key)
    return f(str, value)
}

const objEnvCheck = (obj: any): void => {
    const missingKeys: string[] = []
    objEach(obj, (str) => {
        return objEnvKeyProcess(str, (k, v) => {
            if (!v) {
                missingKeys.push(k.replace(envKeyPrefix, ''))
            }
            return k
        })
    })
    if (!isEmpty(missingKeys)) {
        console.error(
            `Missing required environment variables: ${missingKeys.join(', ')}`
        )
    }
}

const objEnvFill = (obj: any): void => {
    objEach(obj, (str) => {
        return objEnvKeyProcess(str, (k, v) => {
            if (v) {
                return v
            }
            return k
        })
    })
}

export { env, objEnvCheck, objEnvFill, tmpPath, platform, terminal }
