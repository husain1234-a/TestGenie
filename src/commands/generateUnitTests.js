const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const AIService = require('../services/aiService');
const FileService = require('../services/fileService');

async function generateUnitTests(context, apiKey) {
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('Please open a code file to generate unit tests.');
            return;
        }

        const document = editor.document;
        const fileContent = document.getText();
        const fileName = path.basename(document.fileName);
        const fileExtension = path.extname(document.fileName).toLowerCase();
        const fileDir = path.dirname(document.fileName);

        // Language detection based on file extension
        const languageMap = {
            '.js': 'javascript',
            '.ts': 'typescript',
            '.py': 'python',
            '.java': 'java',
            '.cs': 'csharp',
            '.go': 'go',
            '.rb': 'ruby',
            '.php': 'php'
        };

        const language = languageMap[fileExtension];
        if (!language) {
            vscode.window.showErrorMessage('Unsupported file type for test generation.');
            return;
        }

        // For JavaScript files, ask if they want Node.js tests specifically
        let testFramework = '';
        if (language === 'javascript') {
            const testTypeSelection = await vscode.window.showQuickPick(
                [
                    { label: 'Jest (Standard JavaScript)', value: 'jest' },
                    { label: 'Node.js (with Mocha/Chai)', value: 'nodejs' }
                ],
                {
                    placeHolder: 'Select test framework',
                    title: 'Choose Test Framework'
                }
            );

            if (!testTypeSelection) {
                return; // User cancelled
            }

            testFramework = testTypeSelection.value;
        }

        // Show progress indicator
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating Unit Tests",
            cancellable: false
        }, async (progress) => {
            progress.report({ message: "Analyzing code and imports..." });

            // For Python files, get imported files content and setup imports
            let importedFilesContent = '';
            let importStatements = '';
            let conftestContent = '';

            if (language === 'python') {
                // Get project root directory
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (workspaceFolders) {
                    const workspaceRoot = workspaceFolders[0].uri.fsPath;
                    
                    // Get all Python files in the project
                    const pythonFiles = await FileService.getAllPythonFiles();
                    
                    // Create a map of module names to their paths
                    const moduleMap = new Map();
                    pythonFiles.forEach(file => {
                        const relativePath = path.relative(workspaceRoot, file.fsPath);
                        const modulePath = relativePath.replace(/\\/g, '.').replace(/\//g, '.').replace('.py', '');
                        moduleMap.set(modulePath, file.fsPath);
                    });

                    // Get imports from the current file
                    const imports = FileService.findImports(fileContent);
                    
                    // Generate import statements
                    importStatements = imports.map(imp => {
                        // Try to find the actual module path
                        const modulePath = Array.from(moduleMap.keys()).find(key => key.endsWith(imp));
                        if (modulePath) {
                            return `from ${modulePath} import *`;
                        }
                        return `import ${imp}`;
                    }).join('\n');

                    // Create conftest.py content
                    conftestContent = `import os
import sys

# Add project root to Python path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

# Import common test fixtures and configurations
import pytest
from unittest.mock import Mock, patch
`;

                    // Get imported files content
                    const importedContents = await FileService.getImportedFilesContent(imports, workspaceFolders);
                    importedFilesContent = Object.entries(importedContents)
                        .map(([importPath, content]) => `\n# Content of imported file: ${importPath}\n${content}`)
                        .join('\n\n');
                }
            }

            progress.report({ message: "Initializing AI model...", increment: 30 });

            // Initialize AI service
            const aiService = new AIService(apiKey);

            progress.report({ message: "Generating test cases...", increment: 40 });

            // Generate test cases
            let generatedTests = await aiService.generateTestCases(fileContent, language, importedFilesContent);

            // Clean up the response
            generatedTests = generatedTests.replace(/^```[\w-]*\n/g, '');
            generatedTests = generatedTests.replace(/\n```$/g, '');

            progress.report({ message: "Writing test file...", increment: 20 });

            // Determine test file name based on language
            const testFileExtensions = {
                javascript: language === 'javascript' && testFramework === 'nodejs' ? '.spec.js' : '.test.js',
                typescript: '.test.ts',
                python: '_test.py',
                java: 'Test.java',
                csharp: 'Tests.cs',
                go: '_test.go',
                ruby: '_spec.rb',
                php: 'Test.php'
            };

            const baseFileName = fileName.replace(fileExtension, '');
            const testFileName = `${baseFileName}${testFileExtensions[language]}`;
            const testFilePath = path.join(path.dirname(document.fileName), testFileName);

            // For Python, create test directory structure and conftest.py
            if (language === 'python') {
                const testDir = path.join(fileDir, 'tests');
                if (!fs.existsSync(testDir)) {
                    fs.mkdirSync(testDir, { recursive: true });
                }

                // Write conftest.py
                const conftestPath = path.join(testDir, 'conftest.py');
                await FileService.writeTestFile(conftestPath, conftestContent);

                // Add import statements to the test file
                generatedTests = `${importStatements}\n\n${generatedTests}`;
            }

            // Write test file
            await FileService.writeTestFile(testFilePath, generatedTests);

            progress.report({ message: "Opening generated tests...", increment: 10 });

            // Open the generated file
            const testDocument = await vscode.workspace.openTextDocument(testFilePath);
            await vscode.window.showTextDocument(testDocument, {
                viewColumn: vscode.ViewColumn.Beside
            });
        });

        vscode.window.showInformationMessage('✅ Unit tests generated successfully!');

    } catch (error) {
        vscode.window.showErrorMessage(`Error generating unit tests: ${error.message}`);
        console.error("Error details:", error);
    }
}

module.exports = generateUnitTests; 