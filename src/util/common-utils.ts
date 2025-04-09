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
const error = console.error
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
    const editor = env('EDITOR')
    if (!editor) {
        error(`$EDITOR is missing`)
        return
    }
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
const exit = () => process.exit()

type IsEmpty = {
    (str: undefined): boolean
    (str: null): boolean
    (str: string): boolean
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

export {
    exit,
    editor,
    stringWidth,
    stdin,
    uuid,
    unixnow,
    containsChinese,
    print,
    println,
    log,
    error,
    isEmpty,
}
