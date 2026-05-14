import * as bunTest from 'bun:test'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { ChalkInstance } from 'chalk'
import type { Color } from 'ora'
import {
    type OutputFn,
    SimplifiedDisplay,
} from '../src/component/simplified-display'
import type {
    ChalkChatBoxTheme,
    ChalkTerminalColor,
    ThemeSemanticColors,
} from '../src/component/theme/theme-type'
import type { LLMNotifyMessageType } from '../src/llm/llm-utils'

type OutputEntry =
    | { type: 'print'; text: string }
    | { type: 'println'; text: string }
    | { type: 'spinner-stop' }
    | { type: 'spinner-start'; msg?: string }

class MockSpinner {
    private isStopped = true
    private log: OutputEntry[]

    constructor(log: OutputEntry[]) {
        this.log = log
    }

    start(msg?: string): void {
        if (this.isStopped) {
            this.log.push({ type: 'spinner-start', msg })
            this.isStopped = false
        }
    }

    stop(): void {
        this.log.push({ type: 'spinner-stop' })
        this.isStopped = true
    }

    show(_text: string): void {}

    setColor(_color: Color): void {}

    fail(_msg: string): void {
        this.log.push({ type: 'spinner-stop' })
        this.isStopped = true
    }
}

const c = ((text: string): string => text) as ChalkInstance

const mockColor: ChalkTerminalColor = {
    black: c,
    red: c,
    green: c,
    yellow: c,
    blue: c,
    magenta: c,
    cyan: c,
    white: c,
    blackBright: c,
    redBright: c,
    greenBright: c,
    yellowBright: c,
    blueBright: c,
    magentaBright: c,
    cyanBright: c,
    whiteBright: c,
}

const mockTheme: ChalkChatBoxTheme = {
    reasoner: { title: c, bolder: c, content: c },
    tools: { title: c, bolder: c, content: c },
    assisant: { title: c, bolder: c, content: c },
}

const mockSemanticColors: ThemeSemanticColors = {
    waiting: 'blue',
    analyzing: 'yellow',
    thinking: 'cyan',
    rendering: 'blue',
    error: 'red',
    completed: 'green',
    toolCalling: 'magenta',
}

function makeToolResult(text: string, isError = false): string {
    return JSON.stringify({
        content: [{ type: 'text', text }],
        isError,
    } as CallToolResult)
}

let outputLog: OutputEntry[]
let mockOutput: OutputFn

function createDisplayNoSpinner(): SimplifiedDisplay {
    return new SimplifiedDisplay({
        color: mockColor,
        theme: mockTheme,
        semanticColors: mockSemanticColors,
        enableSpinner: false,
        enableRealtimeRender: true,
        output: mockOutput,
    })
}

function createDisplayWithSpinner(): {
    display: SimplifiedDisplay
    spinner: MockSpinner
} {
    const display = new SimplifiedDisplay({
        color: mockColor,
        theme: mockTheme,
        semanticColors: mockSemanticColors,
        enableSpinner: false,
        enableRealtimeRender: true,
        output: mockOutput,
    })
    const spinner = new MockSpinner(outputLog)
    ;(display as unknown as { spinner: MockSpinner }).spinner = spinner
    return { display, spinner }
}

function getPrints(): string[] {
    return outputLog
        .filter((e): e is { type: 'print'; text: string } => e.type === 'print')
        .map((e) => e.text)
}

function getPrintlns(): string[] {
    return outputLog
        .filter(
            (e): e is { type: 'println'; text: string } => e.type === 'println',
        )
        .map((e) => e.text)
}

bunTest.describe('SimplifiedDisplay', () => {
    bunTest.beforeEach(() => {
        outputLog = []
        mockOutput = {
            print: (text: string) => {
                outputLog.push({ type: 'print', text })
            },
            println: (text: string) => {
                outputLog.push({ type: 'println', text })
            },
        }
    })

    bunTest.describe('needsNewline flag', () => {
        bunTest.test('set true after contentShow', () => {
            const d = createDisplayNoSpinner()
            d.contentShow('hi')
            bunTest
                .expect(
                    (d as unknown as { needsNewline: boolean }).needsNewline,
                )
                .toBe(true)
        })

        bunTest.test('reset false after contentStop', () => {
            const d = createDisplayNoSpinner()
            d.contentShow('hi')
            d.contentStop()
            bunTest
                .expect(
                    (d as unknown as { needsNewline: boolean }).needsNewline,
                )
                .toBe(false)
        })

        bunTest.test('set true after think', () => {
            const d = createDisplayNoSpinner()
            d.think('hmm')
            bunTest
                .expect(
                    (d as unknown as { needsNewline: boolean }).needsNewline,
                )
                .toBe(true)
        })

        bunTest.test('reset false after stopThink', () => {
            const d = createDisplayNoSpinner()
            d.think('hmm')
            d.stopThink()
            bunTest
                .expect(
                    (d as unknown as { needsNewline: boolean }).needsNewline,
                )
                .toBe(false)
        })

        bunTest.test('change() calls ensureNewline clearing flag', () => {
            const { display } = createDisplayWithSpinner()
            display.contentShow('hi')
            bunTest
                .expect(
                    (display as unknown as { needsNewline: boolean })
                        .needsNewline,
                )
                .toBe(true)
            display.change('toolCalling' as LLMNotifyMessageType)
            bunTest
                .expect(
                    (display as unknown as { needsNewline: boolean })
                        .needsNewline,
                )
                .toBe(false)
        })

        bunTest.test('toolCall() calls ensureNewline clearing flag', () => {
            const { display } = createDisplayWithSpinner()
            display.contentShow('hi')
            bunTest
                .expect(
                    (display as unknown as { needsNewline: boolean })
                        .needsNewline,
                )
                .toBe(true)
            display.toolCall('fn')
            bunTest
                .expect(
                    (display as unknown as { needsNewline: boolean })
                        .needsNewline,
                )
                .toBe(false)
        })

        bunTest.test(
            'toolCallResult role transition clears needsNewline',
            () => {
                const { display } = createDisplayWithSpinner()
                display.contentShow('hi')
                display.contentStop()
                display.toolCall('fn')
                display.toolCallResult(makeToolResult('ok'))
                bunTest
                    .expect(
                        (display as unknown as { needsNewline: boolean })
                            .needsNewline,
                    )
                    .toBe(false)
            },
        )
    })

    bunTest.describe('ensureNewline emits println when flag is true', () => {
        bunTest.test(
            'contentShow → change: println emitted between print and spinner-start',
            () => {
                const { display } = createDisplayWithSpinner()
                display.contentShow('Hello')
                display.change('toolCalling' as LLMNotifyMessageType)

                const printIdx = outputLog.findLastIndex(
                    (e) => e.type === 'print',
                )
                const spinnerIdx = outputLog.findIndex(
                    (e) => e.type === 'spinner-start',
                )
                bunTest.expect(printIdx).toBeGreaterThan(-1)
                bunTest.expect(spinnerIdx).toBeGreaterThan(printIdx)

                const between = outputLog.slice(printIdx + 1, spinnerIdx)
                bunTest
                    .expect(between.some((e) => e.type === 'println'))
                    .toBe(true)
            },
        )

        bunTest.test(
            'contentShow → toolCall: println emitted between print and spinner-stop',
            () => {
                const { display } = createDisplayWithSpinner()
                display.contentShow('Hello')
                display.toolCall('read_file')

                const printIdx = outputLog.findLastIndex(
                    (e) => e.type === 'print',
                )
                const lastStopIdx = outputLog.findLastIndex(
                    (e) => e.type === 'spinner-stop',
                )
                bunTest.expect(printIdx).toBeGreaterThan(-1)
                bunTest.expect(lastStopIdx).toBeGreaterThan(printIdx)

                const between = outputLog.slice(printIdx + 1, lastStopIdx)
                bunTest
                    .expect(between.some((e) => e.type === 'println'))
                    .toBe(true)
            },
        )

        bunTest.test(
            'think → change: println emitted between print and spinner-start',
            () => {
                const { display } = createDisplayWithSpinner()
                display.think('thinking...')
                display.change('analyzing' as LLMNotifyMessageType)

                const printIdx = outputLog.findLastIndex(
                    (e) => e.type === 'print',
                )
                const spinnerIdx = outputLog.findIndex(
                    (e) => e.type === 'spinner-start',
                )
                bunTest.expect(printIdx).toBeGreaterThan(-1)
                bunTest.expect(spinnerIdx).toBeGreaterThan(printIdx)

                const between = outputLog.slice(printIdx + 1, spinnerIdx)
                bunTest
                    .expect(between.some((e) => e.type === 'println'))
                    .toBe(true)
            },
        )
    })

    bunTest.describe(
        'no double-newline when contentStop already emitted newlines',
        () => {
            bunTest.test(
                'contentStop → change: no extra newline from ensureNewline',
                () => {
                    const { display } = createDisplayWithSpinner()
                    display.contentShow('Hello')
                    display.contentStop()
                    const countAfterStop = outputLog.filter(
                        (e) => e.type === 'println',
                    ).length

                    display.change('waiting' as LLMNotifyMessageType)
                    const countAfterChange = outputLog.filter(
                        (e) => e.type === 'println',
                    ).length

                    bunTest.expect(countAfterChange).toBe(countAfterStop)
                },
            )

            bunTest.test(
                'stopThink → change: no extra newline from ensureNewline',
                () => {
                    const { display } = createDisplayWithSpinner()
                    display.think('hmm')
                    display.stopThink()
                    const countAfterStop = outputLog.filter(
                        (e) => e.type === 'println',
                    ).length

                    display.change('waiting' as LLMNotifyMessageType)
                    const countAfterChange = outputLog.filter(
                        (e) => e.type === 'println',
                    ).length

                    bunTest.expect(countAfterChange).toBe(countAfterStop)
                },
            )
        },
    )

    bunTest.describe('role transitions produce separator newlines', () => {
        bunTest.test('assistant → tools transition adds newline', () => {
            const d = createDisplayNoSpinner()
            d.contentShow('Hello')
            d.contentStop()
            d.toolCall('fn')

            const printlns = getPrintlns()
            bunTest.expect(printlns.length).toBeGreaterThanOrEqual(2)
        })

        bunTest.test('idle → assistant needs no separator', () => {
            const d = createDisplayNoSpinner()
            d.contentShow('First')
            const prints = getPrints()
            bunTest.expect(prints).toEqual(['First'])
        })
    })

    bunTest.describe('tool result display', () => {
        bunTest.test('successful tool shows checkmark', () => {
            const d = createDisplayNoSpinner()
            d.toolCall('read_file')
            d.toolCallResult(makeToolResult('ok'))

            const printlns = getPrintlns()
            const hasCheck = printlns.some(
                (l) => l.includes('[read_file]') && l.includes('✓'),
            )
            bunTest.expect(hasCheck).toBe(true)
        })

        bunTest.test('failed tool shows cross', () => {
            const d = createDisplayNoSpinner()
            d.toolCall('bad_tool')
            d.toolCallResult(makeToolResult('error', true))

            const printlns = getPrintlns()
            const hasCross = printlns.some(
                (l) => l.includes('[bad_tool]') && l.includes('✗'),
            )
            bunTest.expect(hasCross).toBe(true)
        })
    })

    bunTest.describe('error handling', () => {
        bunTest.test('error does not throw', () => {
            const { display } = createDisplayWithSpinner()
            bunTest.expect(() => display.error()).not.toThrow()
        })
    })
})
