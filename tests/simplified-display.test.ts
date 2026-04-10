import { beforeEach, describe, expect, test } from 'bun:test'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
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

const c = (text: string): string => text

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

describe('SimplifiedDisplay', () => {
    beforeEach(() => {
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

    describe('needsNewline flag', () => {
        test('set true after contentShow', () => {
            const d = createDisplayNoSpinner()
            d.contentShow('hi')
            expect(
                (d as unknown as { needsNewline: boolean }).needsNewline,
            ).toBe(true)
        })

        test('reset false after contentStop', () => {
            const d = createDisplayNoSpinner()
            d.contentShow('hi')
            d.contentStop()
            expect(
                (d as unknown as { needsNewline: boolean }).needsNewline,
            ).toBe(false)
        })

        test('set true after think', () => {
            const d = createDisplayNoSpinner()
            d.think('hmm')
            expect(
                (d as unknown as { needsNewline: boolean }).needsNewline,
            ).toBe(true)
        })

        test('reset false after stopThink', () => {
            const d = createDisplayNoSpinner()
            d.think('hmm')
            d.stopThink()
            expect(
                (d as unknown as { needsNewline: boolean }).needsNewline,
            ).toBe(false)
        })

        test('change() calls ensureNewline clearing flag', () => {
            const { display } = createDisplayWithSpinner()
            display.contentShow('hi')
            expect(
                (display as unknown as { needsNewline: boolean }).needsNewline,
            ).toBe(true)
            display.change('toolCalling' as LLMNotifyMessageType)
            expect(
                (display as unknown as { needsNewline: boolean }).needsNewline,
            ).toBe(false)
        })

        test('toolCall() calls ensureNewline clearing flag', () => {
            const { display } = createDisplayWithSpinner()
            display.contentShow('hi')
            expect(
                (display as unknown as { needsNewline: boolean }).needsNewline,
            ).toBe(true)
            display.toolCall('sv', '1', 'fn', '{}')
            expect(
                (display as unknown as { needsNewline: boolean }).needsNewline,
            ).toBe(false)
        })

        test('toolCallResult role transition clears needsNewline', () => {
            const { display } = createDisplayWithSpinner()
            display.contentShow('hi')
            display.contentStop()
            display.toolCall('sv', '1', 'fn', '{}')
            display.toolCallResult(makeToolResult('ok'))
            expect(
                (display as unknown as { needsNewline: boolean }).needsNewline,
            ).toBe(false)
        })
    })

    describe('ensureNewline emits println when flag is true', () => {
        test('contentShow → change: println emitted between print and spinner-start', () => {
            const { display } = createDisplayWithSpinner()
            display.contentShow('Hello')
            display.change('toolCalling' as LLMNotifyMessageType)

            const printIdx = outputLog.findLastIndex((e) => e.type === 'print')
            const spinnerIdx = outputLog.findIndex(
                (e) => e.type === 'spinner-start',
            )
            expect(printIdx).toBeGreaterThan(-1)
            expect(spinnerIdx).toBeGreaterThan(printIdx)

            const between = outputLog.slice(printIdx + 1, spinnerIdx)
            expect(between.some((e) => e.type === 'println')).toBe(true)
        })

        test('contentShow → toolCall: println emitted between print and spinner-stop', () => {
            const { display } = createDisplayWithSpinner()
            display.contentShow('Hello')
            display.toolCall('sv', '1', 'read_file', '{}')

            const printIdx = outputLog.findLastIndex((e) => e.type === 'print')
            const lastStopIdx = outputLog.findLastIndex(
                (e) => e.type === 'spinner-stop',
            )
            expect(printIdx).toBeGreaterThan(-1)
            expect(lastStopIdx).toBeGreaterThan(printIdx)

            const between = outputLog.slice(printIdx + 1, lastStopIdx)
            expect(between.some((e) => e.type === 'println')).toBe(true)
        })

        test('think → change: println emitted between print and spinner-start', () => {
            const { display } = createDisplayWithSpinner()
            display.think('thinking...')
            display.change('analyzing' as LLMNotifyMessageType)

            const printIdx = outputLog.findLastIndex((e) => e.type === 'print')
            const spinnerIdx = outputLog.findIndex(
                (e) => e.type === 'spinner-start',
            )
            expect(printIdx).toBeGreaterThan(-1)
            expect(spinnerIdx).toBeGreaterThan(printIdx)

            const between = outputLog.slice(printIdx + 1, spinnerIdx)
            expect(between.some((e) => e.type === 'println')).toBe(true)
        })
    })

    describe('no double-newline when contentStop already emitted newlines', () => {
        test('contentStop → change: no extra newline from ensureNewline', () => {
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

            expect(countAfterChange).toBe(countAfterStop)
        })

        test('stopThink → change: no extra newline from ensureNewline', () => {
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

            expect(countAfterChange).toBe(countAfterStop)
        })
    })

    describe('content accumulation', () => {
        test('multiple contentShow calls accumulate', () => {
            const d = createDisplayNoSpinner()
            d.contentShow('A')
            d.contentShow('B')
            d.contentShow('C')
            d.contentStop()
            expect(d.result().assistant).toEqual(['A', 'B', 'C'])
        })

        test('contentStop then contentShow again', () => {
            const d = createDisplayNoSpinner()
            d.contentShow('First')
            d.contentStop()
            d.contentShow('Second')
            d.contentStop()
            expect(d.result().assistant).toEqual(['First', 'Second'])
        })

        test('reasoning content accumulates', () => {
            const d = createDisplayNoSpinner()
            d.think('hmm')
            d.think(' let me think')
            d.stopThink()
            expect(d.result().reasoning).toEqual(['hmm', ' let me think'])
        })

        test('tool result stored', () => {
            const d = createDisplayNoSpinner()
            d.toolCall('sv', '1', 'read', '{}')
            const r = makeToolResult('ok')
            d.toolCallResult(r)
            expect(d.result().tools).toEqual([r])
        })

        test('full flow preserves all data', () => {
            const d = createDisplayNoSpinner()
            d.think('analyzing')
            d.stopThink()
            d.contentShow('answer')
            d.contentStop()
            d.toolCall('sv', '1', 'search', '{"q":"test"}')
            d.toolCallResult(makeToolResult('result'))

            expect(d.result().reasoning).toEqual(['analyzing'])
            expect(d.result().assistant).toEqual(['answer'])
            expect(d.result().tools.length).toBe(1)
        })
    })

    describe('role transitions produce separator newlines', () => {
        test('assistant → tools transition adds newline', () => {
            const d = createDisplayNoSpinner()
            d.contentShow('Hello')
            d.contentStop()
            d.toolCall('sv', '1', 'fn', '{}')

            const printlns = getPrintlns()
            expect(printlns.length).toBeGreaterThanOrEqual(2)
        })

        test('idle → assistant needs no separator', () => {
            const d = createDisplayNoSpinner()
            d.contentShow('First')
            const prints = getPrints()
            expect(prints).toEqual(['First'])
        })
    })

    describe('complete flow with spinner - no content loss', () => {
        test('assistant content → tool call → more content: all prints present', () => {
            const { display } = createDisplayWithSpinner()
            display.contentShow('Let me check')
            display.change('toolCalling' as LLMNotifyMessageType)
            display.toolCall('sv', '1', 'read_file', '{}')
            display.toolCallResult(makeToolResult('file content'))
            display.contentShow(' Here is the answer')
            display.contentStop()

            const prints = getPrints()
            expect(prints).toContain('Let me check')
            expect(prints).toContain(' Here is the answer')
            expect(display.result().assistant).toEqual([
                'Let me check',
                ' Here is the answer',
            ])
        })

        test('continuous contentShow with tool interleave', () => {
            const { display } = createDisplayWithSpinner()
            display.contentShow('Start')
            display.contentShow(' middle')
            display.contentStop()
            display.toolCall('sv', '1', 't1', '{}')
            display.toolCallResult(makeToolResult('r1'))
            display.contentShow(' end')
            display.contentStop()

            expect(display.result().assistant).toEqual([
                'Start',
                ' middle',
                ' end',
            ])
        })
    })

    describe('tool result display', () => {
        test('successful tool shows checkmark', () => {
            const d = createDisplayNoSpinner()
            d.toolCall('sv', '1', 'read_file', '{}')
            d.toolCallResult(makeToolResult('ok'))

            const printlns = getPrintlns()
            const hasCheck = printlns.some(
                (l) => l.includes('[read_file]') && l.includes('✓'),
            )
            expect(hasCheck).toBe(true)
        })

        test('failed tool shows cross', () => {
            const d = createDisplayNoSpinner()
            d.toolCall('sv', '1', 'bad_tool', '{}')
            d.toolCallResult(makeToolResult('error', true))

            const printlns = getPrintlns()
            const hasCross = printlns.some(
                (l) => l.includes('[bad_tool]') && l.includes('✗'),
            )
            expect(hasCross).toBe(true)
        })
    })

    describe('error handling', () => {
        test('error does not throw', () => {
            const { display } = createDisplayWithSpinner()
            expect(() => display.error()).not.toThrow()
        })
    })
})
