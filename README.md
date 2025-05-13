# TestGenie

TestGenie is an AI-powered test generation extension for Visual Studio Code that helps developers automate test creation and analysis.

## Features

TestGenie provides the following key features:

* **AI-Powered Test Generation**
  * Generate API tests from project code
  * Create unit tests for selected code
  * Generate project-level test suites
  * Support for Python, Java, and Node.js projects

* **Code Understanding**
  * Explain selected code segments using AI
  * Get detailed analysis of code functionality and patterns
  * Receive suggestions for improvements

* **Test Management**
  * Run test cases directly from VS Code
  * Analyze test results with AI-generated insights
  * View test coverage and performance metrics
  * Get recommendations for test improvements

* **Interactive AI Chat**
  * Chat with TestGenie about testing strategies
  * Get help with test-related questions
  * Receive guidance on best practices

## Requirements

* Visual Studio Code version 1.60.0 or higher
* Active internet connection for AI features
* API key for Google's Generative AI (Gemini)

## Installation

1. Open Visual Studio Code
2. Go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`)
3. Search for "TestGenie"
4. Click Install
5. When prompted, enter your Gemini API key
   * If you don't have an API key, you can get one from the Google AI Studio
   * The API key will be securely stored in VS Code's secret storage

## Usage

### Generating Tests

1. **Generate API Tests**
   ```bash
   1. Open your OpenAPI contract file (JSON or YAML)
   2. Press Ctrl+Shift+P (Cmd+Shift+P on macOS)
   3. Type "TestGenie: Generate API Tests"
   4. Select the target programming language
   ```

2. **Generate Unit Tests**
   ```bash
   1. Open the source file
   2. Select the code you want to test
   3. Press Ctrl+Shift+P (Cmd+Shift+P on macOS)
   4. Type "TestGenie: Generate Unit Tests"
   ```

3. **Generate Project Tests**
   ```bash
   1. Open your project in VS Code
   2. Press Ctrl+Shift+P (Cmd+Shift+P on macOS)
   3. Type "TestGenie: Generate Project Tests"
   ```

### Code Understanding

1. **Explain Code**
   ```bash
   1. Select the code you want to understand
   2. Right-click and select "TestGenie: Explain Code"
   or
   1. Select code
   2. Press Ctrl+Shift+P (Cmd+Shift+P on macOS)
   3. Type "TestGenie: Explain Code"
   ```

### Test Execution and Analysis

1. **Run Tests**
   ```bash
   1. Press Ctrl+Shift+P (Cmd+Shift+P on macOS)
   2. Type "TestGenie: Run Test Cases"
   ```

2. **Analyze Test Results**
   ```bash
   1. After running tests
   2. Press Ctrl+Shift+P (Cmd+Shift+P on macOS)
   3. Type "TestGenie: Analyze Test Results"
   ```

### AI Chat

1. **Start Chat**
   ```bash
   1. Press Ctrl+Shift+P (Cmd+Shift+P on macOS)
   2. Type "TestGenie: Start TestGenie Chat"
   3. Type your questions or requests in the chat panel
   ```

## Extension Settings

This extension contributes the following settings:

* `testgenie.enable`: Enable/disable the TestGenie extension
* `testgenie.apiKey`: Your Gemini API key (stored securely)

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

### 1.0.0

Initial release of TestGenie with the following features:
- AI-powered test generation
- Code explanation
- Test analysis
- Interactive chat

---

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**