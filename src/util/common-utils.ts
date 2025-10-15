/* eslint-disable @typescript-eslint/no-unused-vars */
import path from 'path'
import { env, tmpPath } from './platform-utils'

const debug = false
const println = console.log

const print = (str: string): boolean => {
    return process.stdout.write(str)
}
const log = (str: string): void => {
    if (debug) {
        console.log(str)
    }
}
const uuid = (): string => {
    return Bun.randomUUIDv7().replaceAll('-', '')
}

const unixnow = (): number => {
    return Date.now()
}
const containsChinese = (str: string): boolean => {
    return /[\u4e00-\u9fa5]/.test(str)
}

const stdin = async (): Promise<string | undefined> => {
    for await (const chunk of Bun.stdin.stream()) {
        return Buffer.from(chunk).toString()
    }
}

const stringWidth = (str: string): number => {
    return Bun.stringWidth(str)
}

const editor = async (
    content: string,
    fileType: string = 'md'
): Promise<string> => {
    const editor = env('EDITOR') ?? 'vim'
    const tmpFile = path.join(tmpPath(), `tmp-${uuid()}.${fileType}`)
    await Bun.write(tmpFile, content, { createPath: false })
    const proc = Bun.spawn([editor, tmpFile], {
        stdio: ['inherit', 'inherit', 'inherit'],
    })
    await proc.exited
    const editorText = await Bun.file(tmpFile).text()
    await Bun.file(tmpFile).delete()
    return editorText
}

const isTextSame = (sourceText: string, text: string): boolean => {
    const hasher = new Bun.CryptoHasher('sha256')
    const digest = (str: string) => {
        hasher.update(str)
        return hasher.digest().toString()
    }
    return digest(sourceText) === digest(text)
}

const exit = (): never => {
    process.exit()
}

const isEmpty = <T>(param: string | T[] | undefined | null): boolean => {
    if (!param) {
        return true
    }
    if (typeof param === 'string') {
        return param.length <= 0
    }
    const arr = param as Array<T>
    return arr.length <= 0
}

const groupBy = <T, R>(arr: T[], key: (i: T) => R): Map<R, T[]> => {
    return arr.reduce((df, it) => {
        const v = df.get(key(it))
        if (v) {
            v.push(it)
        } else {
            df.set(key(it), [it])
        }
        return df
    }, new Map<R, T[]>())
}

const jsonformat = (jsonString: string): string => {
    try {
        return JSON.stringify(JSON.parse(jsonString), null, 4)
    } catch (err: unknown) {
        return jsonString
    }
}

const objToJson = (obj: unknown): string => {
    return JSON.stringify(obj, null, 4)
}

type VoidResult = Promise<void> | void
type OptionType = string | boolean | undefined
type OptionAction = () => VoidResult

const matchRun = async (
    orderedMatchItems: [OptionType, OptionAction][],
    defaultAction?: () => VoidResult
): Promise<void> => {
    await orderedMatchItems.find((it) => it[0])?.[1]()
    if (defaultAction) {
        await defaultAction()
    }
}

const parseIntNumber = (str: string | undefined, def: number): number => {
    if (!str) {
        return def
    }
    const num = parseInt(str)
    return isNaN(num) ? def : num
}

export {
    type VoidResult,
    type OptionType,
    type OptionAction,
    containsChinese,
    editor,
    exit,
    groupBy,
    isEmpty,
    isTextSame,
    jsonformat,
    objToJson,
    log,
    matchRun,
    print,
    println,
    stdin,
    stringWidth,
    unixnow,
    uuid,
    parseIntNumber,
}
