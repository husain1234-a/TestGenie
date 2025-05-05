const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const AIService = require('../services/aiService');
const FileService = require('../services/fileService');

async function generateTests(context, apiKey) {
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('Please open an OpenAPI contract file (JSON or YAML).');
            return;
        }

        // Language selection
        const selectedLanguage = await vscode.window.showQuickPick(
            [
                { label: 'Python', value: 'python' },
                { label: 'Java', value: 'java' },
                { label: 'Node.js', value: 'nodejs' }
            ],
            {
                placeHolder: 'Select the test language',
                title: 'Choose Test Language'
            }
        );

        if (!selectedLanguage) {
            return; // User cancelled the selection
        }

        // Start the progress indicator
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating Test Cases",
            cancellable: false
        }, async (progress) => {
            progress.report({ message: "Parsing OpenAPI contract..." });

            const document = editor.document;
            const fileContent = document.getText();
            const fileExtension = path.extname(document.fileName).toLowerCase();

            // Parse contract file
            const contract = FileService.parseContractFile(fileContent, fileExtension);

            progress.report({ message: "Initializing AI model...", increment: 30 });

            // Initialize AI service
            const aiService = new AIService(apiKey);

            progress.report({ message: "Generating test cases...", increment: 40 });

            // Generate test cases
            let generatedTests = await aiService.generateApiTests(contract, selectedLanguage.value);

            // Clean up the response
            generatedTests = generatedTests.replace(/^```(python|java|javascript|js)\n/g, '');
            generatedTests = generatedTests.replace(/\n```$/g, '');
            generatedTests = generatedTests.replace(/```/g, '');

            if (!generatedTests) {
                vscode.window.showErrorMessage('No test cases were generated.');
                return;
            }

            progress.report({ message: "Writing test file...", increment: 20 });

            // Create file with appropriate extension
            const currentDir = path.dirname(document.fileName);
            const fileExtensions = {
                python: 'py',
                java: 'java',
                nodejs: 'js'
            };

            // Set appropriate test file name based on language
            let testFileName;
            if (selectedLanguage.value === 'java') {
                testFileName = 'ApiTests.java';
            } else if (selectedLanguage.value === 'nodejs') {
                testFileName = 'api.test.js';
            } else {
                testFileName = 'api_tests.py';
            }

            const testFilePath = path.join(currentDir, testFileName);

            // Add appropriate headers based on language
            let finalContent;
            if (selectedLanguage.value === 'java') {
                finalContent = generatedTests;  // Java files don't need additional comments at the top
            } else if (selectedLanguage.value === 'nodejs') {
                finalContent = `// Generated test cases for ${path.basename(document.fileName)}
// Using Jest and Supertest frameworks
${generatedTests}`;
            } else {
                finalContent = `# Generated test cases for ${path.basename(document.fileName)}
${generatedTests}`;
            }

            // Write to file
            await FileService.writeTestFile(testFilePath, finalContent);

            progress.report({ message: "Opening generated tests...", increment: 10 });

            // Open the generated file
            const testDocument = await vscode.workspace.openTextDocument(testFilePath);
            await vscode.window.showTextDocument(testDocument);
        });

        vscode.window.showInformationMessage(`✅ Test cases have been generated successfully in ${{
            'python': 'api_tests.py',
            'java': 'ApiTests.java',
            'nodejs': 'api.test.js'
        }[selectedLanguage.value]}`);

    } catch (error) {
        vscode.window.showErrorMessage(`Error generating tests: ${error.message}`);
        console.error("Error details:", error);
    }
}

module.exports = generateTests; 