/* eslint-disable @typescript-eslint/no-unused-vars */
import path from 'path'
import { env, tmpPath } from './platform-utils'

const debug = false

const print = (str: string) => process.stdout.write(str)
const log = (str: string) => {
    if (debug) {
        console.log(str)
    }
}
const println = console.log
const uuid = () => Bun.randomUUIDv7().replaceAll('-', '')
const unixnow = (): number => Date.now()
const containsChinese = (str: string): boolean => /[\u4e00-\u9fa5]/.test(str)

const stdin = async () => {
    for await (const chunk of Bun.stdin.stream()) {
        return Buffer.from(chunk).toString()
    }
}

const stringWidth = (str: string) => Bun.stringWidth(str)

const editor = async (content: string, fileType: string = 'md') => {
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

const isTextSame = (sourceText: string, text: string) => {
    const hasher = new Bun.CryptoHasher('sha256')
    const digest = (str: string) => {
        hasher.update(str)
        return hasher.digest().toString()
    }
    return digest(sourceText) === digest(text)
}

const exit = () => process.exit()

type IsEmpty = {
    (str: undefined): boolean
    (str: null): boolean
    (str: string): boolean
    (str: string | undefined): boolean
    <T>(arr: T[]): boolean
}

const isEmpty: IsEmpty = <T>(param: string | T[] | undefined | null) => {
    if (!param) {
        return true
    }
    if (typeof param === 'string') {
        return param.length <= 0
    }
    const arr = param as Array<T>
    return arr.length <= 0
}

const groupBy = <T, R>(arr: T[], key: (i: T) => R) => {
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

const jsonformat = (jsonString: string) => {
    try {
        return JSON.stringify(JSON.parse(jsonString), null, 4)
    } catch (err: unknown) {
        return jsonString
    }
}

export type VoidResult = Promise<void> | void
export type OptionType = string | boolean | undefined
export type OptionAction = () => VoidResult

const matchRun = async (
    orderedMatchItems: [OptionType, OptionAction][],
    defaultAction?: () => VoidResult
): Promise<void> => {
    await orderedMatchItems.find((it) => it[0])?.[1]()
    if (defaultAction) {
        await defaultAction()
    }
}

const parseIntNumber = (str: string | undefined, def: number) => {
    if (!str) {
        return def
    }
    const num = parseInt(str)
    return isNaN(num) ? def : num
}

export {
    containsChinese,
    editor,
    exit,
    groupBy,
    isEmpty,
    isTextSame,
    jsonformat,
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
