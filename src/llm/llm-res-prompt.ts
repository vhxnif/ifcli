import {
    createPrompt,
    useState,
    useKeypress,
    makeTheme,
    type Theme,
} from "@inquirer/core"
import type { PartialDeep } from "@inquirer/type"
import { color } from "../util/color-utils"

type ConfirmConfig = {
    content: string[]
    think?: string[]
    start?: number
    theme?: PartialDeep<Theme>
}

type TabInfo = {
    data: string[],
    setIndex: (v: number) => void
}

type Tab = {
    name: 'Content' | 'Think',
    info: TabInfo,
    next?: Tab
    prev?: Tab
}

export default createPrompt<number, ConfirmConfig>((config, done) => {
    const { content, think, start } = config
    const [thinkPageIndex, setThinkPageIndex] = useState(start ?? 0)
    const [contentPageIndex, setContentPageIndex] = useState(start ?? 0)
    const contentTab: Tab = {
        name: 'Content',
        info: {
            data: content,
            setIndex: setContentPageIndex
        },
    }
    if(think) {
        const thinkTab: Tab = {
            name: 'Think',
            info: {
                data: think,
                setIndex: setThinkPageIndex
            },
            next: contentTab,
            prev: contentTab,
        }
        contentTab.next = thinkTab
        contentTab.prev = thinkTab
    } 
    const [tab, setTab] = useState(contentTab)
    const theme = makeTheme(config.theme)
    const getIdx = () => tab.name === 'Content' ? contentPageIndex : thinkPageIndex
    useKeypress((key, rl) => {
        const show = (
            command: 'next' | 'prev'
        ) => {
            const { data, setIndex } = tab.info
            const idx = getIdx() 
            let i 
            if(command === 'next') {
                const next = idx + 1
                i = next > data.length - 1 ? idx : next
            } else {
                const prev = idx - 1
                i = prev < 0 ? idx : prev
            }
            setIndex(i)
            rl.clearLine(0)
        }
        const changeTab = (tab: Tab | undefined) => {
            if(tab) {
                setTab(tab)
            }
            rl.clearLine(0)
        }
        const isKey = (str: string) => key.name === str
        if (isKey("k")) {
            show('prev')
        } else if (isKey("j")) {
            show('next')
        } else if (isKey("h")) {
            changeTab(tab.prev)
        } else if (isKey("l")) {
            changeTab(tab.next)
        } else if (isKey("q")) {
            done(-1)
        }
    })
    const { data  } = tab.info
    const idx = getIdx() 
    const currPageNumber = `${idx + 1}/${data.length}`
    const currContent = data[idx]
    const key = (str: string) => theme.style.key(str)
    const message = `PrevTab ${key("h")}, NextPage ${key("j")}, PrevPage ${key("k")}, NextTab ${key("l")}\nTab: ${color.maroon(tab.name)}, Page ${key(currPageNumber)}, Exit ${key("q")} `
    return `${currContent}${message}`
})
