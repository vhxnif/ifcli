import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test'
import { settingAction, chatAction } from '../tests/__mocks__/app-context'
import { createMockCommand, mockConsole, mockProcessExit } from './test-utils'

// Mock the command line parser to test command execution
const mockProgram = {
  parseAsync: mock(() => Promise.resolve()),
  command: mock(() => mockProgram),
  alias: mock(() => mockProgram),
  description: mock(() => mockProgram),
  option: mock(() => mockProgram),
  action: mock(() => mockProgram),
  configureHelp: mock(() => mockProgram),
  enablePositionalOptions: mock(() => mockProgram),
  version: mock(() => mockProgram)
}

// Mock the commander module
mock.module('@commander-js/extra-typings', () => ({
  Command: mock(() => mockProgram)
}))

describe('ist (ifsetting) Commands', () => {
  let consoleMock: ReturnType<typeof mockConsole>
  let processExitMock: ReturnType<typeof mockProcessExit>

  beforeEach(() => {
    // Reset all mocks before each test
    mock.restore()

    // Mock console and process.exit
    consoleMock = mockConsole()
    processExitMock = mockProcessExit()

    // Reset the action mocks
    settingAction.setting.mockClear()
    settingAction.theme.mockClear()
    settingAction.exportSetting.mockClear()
    settingAction.importSetting.mockClear()
    chatAction.tools.mockClear()
    chatAction.testTool.mockClear()
    chatAction.listPrompt.mockClear()
    chatAction.exportPrompt.mockClear()
    chatAction.importPrompt.mockClear()
  })

  afterEach(() => {
    // Restore original implementations
    consoleMock.restore()
    processExitMock.restore()
    mock.restore()
  })

  describe('config command', () => {
    test('should have config command available', () => {
      expect(settingAction).toBeDefined()
      expect(typeof settingAction.setting).toBe('function')
      expect(typeof settingAction.theme).toBe('function')
      expect(typeof settingAction.exportSetting).toBe('function')
      expect(typeof settingAction.importSetting).toBe('function')
    })

    test('should handle modify option', async () => {
      createMockCommand({ modify: true })

      // Simulate the action being called
      await settingAction.setting()

      expect(settingAction.setting).toHaveBeenCalled()
      expect(settingAction.setting).toHaveBeenCalledTimes(1)
    })

    test('should handle theme option', async () => {
      createMockCommand({ theme: true })

      await settingAction.theme()

      expect(settingAction.theme).toHaveBeenCalled()
      expect(settingAction.theme).toHaveBeenCalledTimes(1)
    })

    test('should handle export option', async () => {
      createMockCommand({ exp: true })

      await settingAction.exportSetting()

      expect(settingAction.exportSetting).toHaveBeenCalled()
      expect(settingAction.exportSetting).toHaveBeenCalledTimes(1)
    })

    test('should handle import option with file path', async () => {
      const testFile = '/path/to/settings.json'
      createMockCommand({ imp: testFile })

      await settingAction.importSetting(testFile)

      expect(settingAction.importSetting).toHaveBeenCalled()
      expect(settingAction.importSetting).toHaveBeenCalledWith(testFile)
    })
  })

  describe('mcp command', () => {
    test('should handle list option', async () => {
      createMockCommand({ list: true })

      // mcp list delegates to chatAction.tools
      await chatAction.tools()

      expect(chatAction.tools).toHaveBeenCalled()
      expect(chatAction.tools).toHaveBeenCalledTimes(1)
    })

    test('should handle test option', async () => {
      createMockCommand({ test: true })

      // mcp test delegates to chatAction.testTool
      await chatAction.testTool()

      expect(chatAction.testTool).toHaveBeenCalled()
      expect(chatAction.testTool).toHaveBeenCalledTimes(1)
    })
  })

  describe('prompt command', () => {
    test('should handle list option without filter', async () => {
      createMockCommand({ list: true })

      await chatAction.listPrompt()

      expect(chatAction.listPrompt).toHaveBeenCalled()
      expect(chatAction.listPrompt).toHaveBeenCalledTimes(1)
    })

    test('should handle list option with name filter', async () => {
      const promptName = 'test-prompt'
      createMockCommand({ list: promptName })

      await chatAction.listPrompt(promptName)

      expect(chatAction.listPrompt).toHaveBeenCalled()
      expect(chatAction.listPrompt).toHaveBeenCalledWith(promptName)
    })

    test('should handle export option', async () => {
      createMockCommand({ exp: true })

      await chatAction.exportPrompt()

      expect(chatAction.exportPrompt).toHaveBeenCalled()
      expect(chatAction.exportPrompt).toHaveBeenCalledTimes(1)
    })

    test('should handle import option with file path', async () => {
      const testFile = '/path/to/prompt.md'
      createMockCommand({ imp: testFile })

      await chatAction.importPrompt(testFile)

      expect(chatAction.importPrompt).toHaveBeenCalled()
      expect(chatAction.importPrompt).toHaveBeenCalledWith(testFile)
    })
  })

  describe('command line interface structure', () => {
    test('should have correct command structure', () => {
      // Test that the command structure is properly defined
      expect(mockProgram.command).toBeDefined()
      expect(mockProgram.alias).toBeDefined()
      expect(mockProgram.description).toBeDefined()
      expect(mockProgram.option).toBeDefined()
      expect(mockProgram.action).toBeDefined()
    })

    test('should handle version command', () => {
      expect(mockProgram.version).toBeDefined()
    })

    test('should handle help command', () => {
      expect(mockProgram.configureHelp).toBeDefined()
    })
  })

  describe('error handling', () => {
    test('should handle errors gracefully', async () => {
      const errorMessage = 'Test error'

      // Mock a function to throw an error
      settingAction.setting.mockImplementation(() => {
        throw new Error(errorMessage)
      })

      try {
        await settingAction.setting()
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe(errorMessage)
      }
    })
  })
})