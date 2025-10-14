// Test utilities for ifcli command testing
import { mock } from 'bun:test'

export interface MockCommandOptions {
  modify?: boolean
  theme?: boolean
  exp?: boolean
  imp?: string
  list?: boolean | string
  test?: boolean
}

export const createMockCommand = (options: MockCommandOptions = {}) => {
  return {
    opts: () => options,
    parent: {
      opts: () => ({ force: undefined })
    }
  }
}

export const mockConsole = () => {
  const originalConsole = { ...console }

  const mockConsole = {
    log: mock(() => {}),
    error: mock(() => {}),
    warn: mock(() => {}),
    info: mock(() => {})
  }

  Object.assign(console, mockConsole)

  return {
    restore: () => {
      Object.assign(console, originalConsole)
    },
    ...mockConsole
  }
}

export const mockProcessExit = () => {
  const originalExit = process.exit
  const mockExit = mock(() => {})
  process.exit = mockExit as unknown as (code?: number) => never

  return {
    restore: () => {
      process.exit = originalExit
    },
    mockExit
  }
}

export const waitForPromises = () => new Promise(resolve => setTimeout(resolve, 0))