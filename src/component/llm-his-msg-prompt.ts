import {
    createPrompt,
    makeTheme,
    useKeypress,
    useRef,
    useState,
    type Theme,
} from '@inquirer/core'
import type { PartialDeep } from '@inquirer/type'
import { table } from 'table'
import type { ChatMessage } from '../types/store-types'
import { color } from '../util/color-utils'
import { contentTableHeader, llmTableShow, thinkTableHeader } from '../llm/llm-utils'
import { ShowWin } from '../llm/show-win'
import { tableConfig } from '../util/table-util'

type MessageConfig = {
    messages: ChatMessage[]
    theme?: PartialDeep<Theme>
}
type Mode = 'message' | 'content' | 'reasoning'
type ModeLink = {
    value: Mode
    next: ModeLink
    prev: ModeLink
}
type SimpleMove = {
    idx: number
    limit?: () => number
    normal?: (nextIdx: number) => void
}
type Move = SimpleMove & {
    fallback?: () => void
}
class ModeRun {
    private mode: ModeLink
    private map: Map<Mode, () => unknown> = new Map()
    constructor(mode: ModeLink) {
        this.mode = mode
    }

    message = (f: () => unknown) => {
        this.map.set('message', f)
        return this
    }

    content = (f: () => unknown) => {
        this.map.set('content', f)
        return this
    }

    reasoning = (f: () => unknown) => {
        this.map.set('reasoning', f)
        return this
    }

    run = () => {
        const f = this.map.get(this.mode.value)
        if (f) {
            return f()
        }
    }
}
const move = ({
    idx,
    limit,
    normal,
    fallback,
    predicate,
    nextIdx,
}: Move & {
    predicate: (v: number, limit: number) => boolean
    nextIdx: (idx: number) => number
}) => {
    const i = nextIdx(idx)
    const l = limit?.() ?? 0
    if (predicate(i, l)) {
        normal?.(i)
    }
    fallback?.()
}
const prev = (p: Move) =>
    move({ ...p, predicate: (a) => a >= 0, nextIdx: (i) => i - 1 })
const next = (p: Move) =>
    move({ ...p, predicate: (a, b) => a < b, nextIdx: (i) => i + 1 })
const findRole = (arr: ChatMessage[], role: string) =>
    arr.find((it) => it.role === role)
const findUser = (arr: ChatMessage[]) => findRole(arr, 'user')
const findContent = (arr: ChatMessage[]) => findRole(arr, 'assistant')
const findReasoning = (arr: ChatMessage[]) => findRole(arr, 'reasoning')
const modeLink = (arr: ModeLink[]) => {
    arr.forEach((it, idx) => {
        const next = (idx + 1) % arr.length
        const prev = idx - 1 < 0 ? arr.length + idx - 1 : idx - 1
        it.prev = arr[prev]
        it.next = arr[next]
    })
    return arr[0]
}
const generateModeLink = (arr: ChatMessage[]) => {
    const links: ModeLink[] = []
    const messageProcess = (
        f: (a: ChatMessage[]) => ChatMessage | undefined,
        mode: Mode
    ) => {
        if (f(arr)) {
            links.push({ value: mode } as ModeLink)
        }
    }
    messageProcess(findUser, 'message')
    messageProcess(findContent, 'content')
    messageProcess(findReasoning, 'reasoning')
    return modeLink(links)
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
const messageGrouping = (messages: ChatMessage[]) =>
    groupBy(messages, (m: ChatMessage) => m.pairKey)
        .entries()
        .map((it) => it[1])
        .reduce((df, it) => {
            if (df.length === 0) {
                df.push(it)
                return df
            }
            const nextUser = findUser(it)
            if (!nextUser) {
                return df
            }
            const prevUser = findUser(df[df.length - 1])!
            if (prevUser.actionTime > nextUser.actionTime) {
                df.push(it)
            } else {
                const lastItem = df[df.length - 1]
                df[df.length - 1] = it
                df.push(lastItem)
            }
            return df
        }, [] as ChatMessage[][])
const up = (param: SimpleMove) => prev({ ...param })
const down = (param: SimpleMove) => next({ ...param })
const win = ({
    idx,
    range = 2,
    limit,
}: {
    idx: number
    range?: number
    limit: number
}): [number, number] => {
    if (limit <= 2 * range + 1) {
        return [0, limit - 1]
    }
    if (idx < range) {
        return [0, 2 * range]
    }
    if (idx + range < limit) {
        return [idx - range, idx + range]
    }
    return [limit - 1 - range * 2, limit - 1]
}
export default createPrompt<number, MessageConfig>((config, done) => {
    const { messages } = config
    const theme = makeTheme(config.theme)
    const msgs = messageGrouping(messages)
    const cache = new Map<string, Map<Mode, string[]>>()
    const initMsg = msgs[0]
    const [messageIdx, setMessageIdx] = useState(0)
    const [contentIdx, setContentIdx] = useState(0)
    const [reasoningIdx, setReasoningIdx] = useState(0)
    const [modeLink, setModeLink] = useState(generateModeLink(initMsg))
    const contentRef = useRef<string[]>([])
    const reasoningRef = useRef<string[]>([])

    const resetContent = (content?: string[]) => {
        contentRef.current = content ?? []
        setContentIdx(0)
    }
    const resetReasoning = (reasoning?: string[]) => {
        reasoningRef.current = reasoning ?? []
        setReasoningIdx(0)
    }
    const clearMessageDetail = (i: number) => {
        resetContent()
        resetReasoning()
        setModeLink(generateModeLink(msgs[i]))
    }
    // --- item move ----
    const modeMatchRun = (mode: ModeLink, str: Mode, f: () => void) => {
        if (mode.value === str) {
            f()
        }
    }
    const messageItemMove = (
        mv: (p: SimpleMove) => void,
        limit?: () => number
    ) => {
        let idx = messageIdx
        const normal = (i: number) => {
            idx = i
            setMessageIdx(i)
        }
        mv({ idx: messageIdx, normal, limit })
        clearMessageDetail(idx)
    }
    const messageItemUp = () => messageItemMove(up)
    const messageItemDown = () => messageItemMove(down, () => msgs.length)
    const contentItemUp = () => up({ idx: contentIdx, normal: setContentIdx })
    const contentItemDown = () =>
        down({
            idx: contentIdx,
            normal: setContentIdx,
            limit: () => contentRef.current.length,
        })
    const reasoningItemUp = () =>
        up({ idx: reasoningIdx, normal: setReasoningIdx })
    const reasoningItemDown = () =>
        down({
            idx: reasoningIdx,
            normal: setReasoningIdx,
            limit: () => reasoningRef.current.length,
        })
    const itemVerticalMove = (command: 'up' | 'down') => {
        const move = (left: () => void, right: () => void) =>
            command === 'up' ? left : right
        modeMatchRun(modeLink, 'message', move(messageItemUp, messageItemDown))
        modeMatchRun(modeLink, 'content', move(contentItemUp, contentItemDown))
        modeMatchRun(
            modeLink,
            'reasoning',
            move(reasoningItemUp, reasoningItemDown)
        )
    }
    const itemHorizontalMove = (command: 'left' | 'right') => {
        const mode = command === 'left' ? modeLink.prev : modeLink.next
        setModeLink(mode)
        new ModeRun(mode)
            .message(switchMessageMode)
            .content(switchContentMode)
            .reasoning(switchReasoningMode)
            .run()
    }
    // --- table content parse ---
    const tableContentParse = (str: string, header: string) =>
        llmTableShow({
            header,
            content: new ShowWin().pageSplit(str),
        })
    const contentParse = (str: string) =>
        tableContentParse(str, contentTableHeader)
    const reasoningParse = (str: string) =>
        tableContentParse(str, thinkTableHeader)
    // --- switch mode ---
    const cacheRun = ({
        mode,
        f,
        gt,
        rt,
    }: {
        mode: Mode
        f: (arr: ChatMessage[]) => ChatMessage | undefined
        gt: (str: string) => string[]
        rt: (arr?: string[]) => void
    }) => {
        const { pairKey, content } = f(msgs[messageIdx])!
        if (!cache.has(pairKey)) {
            cache.set(pairKey, new Map<Mode, string[]>())
        }
        const v = cache.get(pairKey)!
        const ct = v.get(mode)
        if (ct) {
            rt(ct)
            return
        }
        const c = gt(content)
        v.set(mode, c)
        rt(c)
    }
    const switchMessageMode = () => {}
    const switchContentMode = () => {
        cacheRun({
            mode: 'content',
            f: findContent,
            gt: contentParse,
            rt: resetContent,
        })
    }
    const switchReasoningMode = () => {
        cacheRun({
            mode: 'reasoning',
            f: findReasoning,
            gt: reasoningParse,
            rt: resetReasoning,
        })
    }
    // --- display ---
    const messageDisplay = () => {
        const winIdx = win({
            idx: messageIdx,
            limit: msgs.length,
        })
        const arr: string[] = []
        for (let index = winIdx[0]; index <= winIdx[1]; index++) {
            let str = `${findUser(msgs[index])?.content}`
            if (index === messageIdx) {
                str = color.green.bold(str)
            }
            arr.push(str)
        }
        return table(
            [[arr.join('\n')]],
            tableConfig({ cols: [1], alignment: 'left' })
        )
    }
    const contentDisplay = () => `${contentRef.current[contentIdx]}`
    const reasoingDisplay = () => `${reasoningRef.current[reasoningIdx]}`
    const display = (mode: ModeLink) => {
        return new ModeRun(mode)
            .message(messageDisplay)
            .content(contentDisplay)
            .reasoning(reasoingDisplay)
            .run() as string
    }
    useKeypress((key, rl) => {
        const isKey = (str: string) => key.name === str
        if (isKey('k')) {
            itemVerticalMove('up')
        } else if (isKey('j')) {
            itemVerticalMove('down')
        } else if (isKey('h')) {
            itemHorizontalMove('left')
        } else if (isKey('l')) {
            itemHorizontalMove('right')
        } else if (isKey('q')) {
            done(-1)
        }
        rl.clearLine(0)
    })
    const key = (str: string) => theme.style.key(str)
    const help = new ModeRun(modeLink)
        .message(() => {
            return `Tab: ${color.flamingo('Message')}, PrevTab: ${key('h')}, NextTab: ${key('l')}, Quit: ${key('q')}`
        })
        .content(() => {
            return `Tab: ${color.flamingo('Assistant')}, Prev: ${key('k')}, Next: ${key('j')}, PrevTab: ${key('h')}, NextTab: ${key('l')}, Quit: ${key('q')}`
        })
        .reasoning(() => {
            return `Tab: ${color.flamingo('Thinking')}, Prev: ${key('k')}, Next: ${key('j')}, PrevTab: ${key('h')}, NextTab: ${key('l')}, Quit: ${key('q')}`
        })
        .run() as string
    return `${display(modeLink)}\n${help}`
})
