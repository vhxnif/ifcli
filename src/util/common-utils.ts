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
const error = console.error
const uuid = () => Bun.randomUUIDv7().replaceAll('-', '')
const unixnow = (): number => Date.now()
const containsChinese = (str: string): boolean => /[\u4e00-\u9fa5]/.test(str)
const optionFunMapping = (
    options: { [x: string]: unknown },
    map: Record<string, (str: unknown) => void>,
    df?: () => void
) => {
    const opt = Object.entries(options).find(([_, v]) => v || v === '')
    if (opt) {
        const [key, value] = opt
        map[`${key}`]?.(value)
        return
    }
    df?.()
}

const stdin = async () => await Bun.stdin.text()
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

export {
    editor,
    stringWidth,
    stdin,
    uuid,
    unixnow,
    containsChinese,
    optionFunMapping,
    print,
    println,
    log,
    error,
}
