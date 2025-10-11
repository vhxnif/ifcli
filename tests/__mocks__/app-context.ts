/* eslint-disable @typescript-eslint/no-unused-vars */
// Mock for app-context to isolate tests from database and external dependencies
import { mock } from 'bun:test'

export const mockSettingAction = {
  setting: mock(() => Promise.resolve()),
  theme: mock(() => Promise.resolve()),
  exportSetting: mock(() => Promise.resolve()),
  importSetting: mock((_file: string) => Promise.resolve()),
  generalSetting: {
    theme: 'ethereal_glow'
  }
}

export const mockChatAction = {
  tools: mock(() => Promise.resolve()),
  testTool: mock(() => Promise.resolve()),
  listPrompt: mock((_name?: string) => Promise.resolve()),
  exportPrompt: mock(() => Promise.resolve()),
  importPrompt: mock((_file: string) => Promise.resolve())
}

export const mockColor = {
  red: (text: string) => text,
  green: (text: string) => text,
  yellow: (text: string) => text,
  blue: (text: string) => text,
  magenta: (text: string) => text,
  cyan: (text: string) => text,
  white: (text: string) => text,
  gray: (text: string) => text,
  bold: {
    red: (text: string) => text,
    green: (text: string) => text,
    yellow: (text: string) => text,
    blue: (text: string) => text,
    magenta: (text: string) => text,
    cyan: (text: string) => text,
    white: (text: string) => text
  }
}

export { mockSettingAction as settingAction, mockChatAction as chatAction, mockColor as color }