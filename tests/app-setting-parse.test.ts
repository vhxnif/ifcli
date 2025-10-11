import { describe, test, expect } from 'bun:test'
import { AppSettingParse } from '../src/config/app-setting'
import type { AppSetting } from '../src/store/store-types'

// Helper function to create AppSetting objects for testing
const createAppSetting = (content: {
  version: string
  generalSetting: string
  mcpServer: string
  llmSetting: string
}): AppSetting => ({
  id: 'test-id',
  createTime: BigInt(Date.now()),
  ...content
})

describe('AppSettingParse - Logic Tests', () => {
  describe('general setting parsing', () => {
    test('should parse general setting correctly', () => {
      // Arrange
      const appSetting = createAppSetting({
        version: '0.1.17',
        generalSetting: JSON.stringify({ theme: 'test-theme' }),
        mcpServer: '[]',
        llmSetting: '[]'
      })
      const parser = new AppSettingParse(appSetting)

      // Act
      const generalSetting = parser.generalSetting()

      // Assert
      expect(generalSetting.theme).toBe('test-theme')
    })

    test('should return default general setting when empty', () => {
      // Arrange
      const appSetting = createAppSetting({
        version: '0.1.17',
        generalSetting: '',
        mcpServer: '[]',
        llmSetting: '[]'
      })
      const parser = new AppSettingParse(appSetting)

      // Act
      const generalSetting = parser.generalSetting()

      // Assert
      expect(generalSetting.theme).toBe('violet_tides') // default theme
    })

    test('should handle corrupted JSON in general setting', () => {
      // Arrange
      const appSetting = createAppSetting({
        version: '0.1.17',
        generalSetting: 'invalid-json',
        mcpServer: '[]',
        llmSetting: '[]'
      })
      const parser = new AppSettingParse(appSetting)

      // Act & Assert
      expect(() => parser.generalSetting()).toThrow()
    })
  })

  describe('MCP servers parsing', () => {
    test('should parse MCP servers correctly', () => {
      // Arrange
      const mcpServers = [{ name: 'test-server', version: 'v1' }]
      const appSetting = createAppSetting({
        version: '0.1.17',
        generalSetting: '{}',
        mcpServer: JSON.stringify(mcpServers),
        llmSetting: '[]'
      })
      const parser = new AppSettingParse(appSetting)

      // Act
      const parsedServers = parser.mcpServers()

      // Assert
      expect(parsedServers).toHaveLength(1)
      expect(parsedServers[0].name).toBe('test-server')
      expect(parsedServers[0].version).toBe('v1')
    })

    test('should handle corrupted JSON in MCP servers', () => {
      // Arrange
      const appSetting = createAppSetting({
        version: '0.1.17',
        generalSetting: '{}',
        mcpServer: 'invalid-json',
        llmSetting: '[]'
      })
      const parser = new AppSettingParse(appSetting)

      // Act & Assert
      expect(() => parser.mcpServers()).toThrow()
    })
  })

  describe('LLM settings parsing', () => {
    test('should merge LLM settings with defaults', () => {
      // Arrange
      const llmSettings = [
        { name: 'deepseek', baseUrl: 'https://api.deepseek.com', apiKey: 'test-key', models: ['model1'] },
        { name: 'ollama', baseUrl: 'http://localhost:11434', apiKey: '', models: [] },
        { name: 'openai', baseUrl: 'https://api.openai.com', apiKey: '', models: ['gpt-4o'] }
      ]
      const appSetting = createAppSetting({
        version: '0.1.17',
        generalSetting: '{}',
        mcpServer: '[]',
        llmSetting: JSON.stringify(llmSettings)
      })
      const parser = new AppSettingParse(appSetting)

      // Act
      const parsedSettings = parser.llmSettings()

      // Assert
      // All settings should be included since withoutDefault is false
      expect(parsedSettings.find(s => s.name === 'deepseek')).toBeDefined()
      expect(parsedSettings.find(s => s.name === 'ollama')).toBeDefined()
      expect(parsedSettings.find(s => s.name === 'openai')).toBeDefined()
    })

    test('should filter LLM settings during parsing', () => {
      // Arrange
      const llmSettings = [
        { name: 'deepseek', baseUrl: 'https://api.deepseek.com', apiKey: 'test-key', models: ['model1'] },
        { name: 'ollama', baseUrl: 'http://localhost:11434', apiKey: '', models: [] },
        { name: 'openai', baseUrl: 'https://api.openai.com', apiKey: '', models: ['gpt-4o'] }
      ]
      const parser = new AppSettingParse(createAppSetting({
        version: '0.1.17',
        generalSetting: '{}',
        mcpServer: '[]',
        llmSetting: '[]'
      }))

      // Act
      const filteredSettings = parser.llmSettingParse(llmSettings)

      // Assert
      const parsedFiltered = JSON.parse(filteredSettings) as Array<{name: string}>
      // deepseek should be included (has apiKey)
      expect(parsedFiltered.find((s: {name: string}) => s.name === 'deepseek')).toBeDefined()
      // ollama should be excluded (no models)
      expect(parsedFiltered.find((s: {name: string}) => s.name === 'ollama')).toBeUndefined()
      // openai should be excluded (no apiKey)
      expect(parsedFiltered.find((s: {name: string}) => s.name === 'openai')).toBeUndefined()
    })

    test('should handle corrupted JSON in LLM settings', () => {
      // Arrange
      const appSetting = createAppSetting({
        version: '0.1.17',
        generalSetting: '{}',
        mcpServer: '[]',
        llmSetting: 'invalid-json'
      })
      const parser = new AppSettingParse(appSetting)

      // Act & Assert
      expect(() => parser.llmSettings()).toThrow()
    })
  })

  describe('edit show functionality', () => {
    test('should generate edit show text correctly', () => {
      // Arrange
      const appSetting = createAppSetting({
        version: '0.1.17',
        generalSetting: JSON.stringify({ theme: 'test-theme' }),
        mcpServer: '[]',
        llmSetting: '[]'
      })
      const parser = new AppSettingParse(appSetting)

      // Act
      const editText = parser.editShow()

      // Assert
      expect(editText).toContain('"generalSetting"')
      expect(editText).toContain('"mcpServers"')
      expect(editText).toContain('"llmSettings"')
      expect(editText).toContain('"test-theme"')
    })
  })
})