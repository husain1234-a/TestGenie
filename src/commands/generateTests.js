const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const AIService = require('../services/aiService');
const FileService = require('../services/fileService');

async function runTests(testFilePath, language) {
    const terminal = vscode.window.createTerminal('TestGenie Tests');
    terminal.show();

    // Get workspace root
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    // Change to workspace directory
    terminal.sendText(`cd "${workspaceRoot}"`);

    const commands = {
        python: async () => {
            // Check if pytest is installed
            terminal.sendText('pip show pytest || pip install pytest');
            // Run pytest with verbose output
            terminal.sendText('python -m pytest -v');
        },
        java: async () => {
            // Check if it's a Maven project
            if (fs.existsSync(path.join(workspaceRoot, 'pom.xml'))) {
                terminal.sendText('mvn test');
            } else {
                // Fallback to direct JUnit execution
                terminal.sendText('javac -cp .:junit-4.13.2.jar:hamcrest-core-1.3.jar *.java && java -cp .:junit-4.13.2.jar:hamcrest-core-1.3.jar org.junit.runner.JUnitCore ApiTests');
            }
        },
        nodejs: async () => {
            // Check if package.json exists and has test script
            const packageJsonPath = path.join(workspaceRoot, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                if (packageJson.scripts && packageJson.scripts.test) {
                    terminal.sendText('npm test');
                } else {
                    // Add test script if missing
                    terminal.sendText('npm install --save-dev jest && npm pkg set scripts.test="jest" && npm test');
                }
            } else {
                vscode.window.showErrorMessage('No package.json found. Please initialize your Node.js project first.');
            }
        }
    };

    try {
        await commands[language]();
    } catch (error) {
        vscode.window.showErrorMessage(`Error running tests: ${error.message}`);
    }
}

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

            // Ask user if they want to run the tests
            const runTestsResponse = await vscode.window.showQuickPick(
                ['Yes', 'No'],
                {
                    placeHolder: 'Would you like to run the generated tests?',
                    title: 'Run Tests'
                }
            );

            if (runTestsResponse === 'Yes') {
                await runTests(testFilePath, selectedLanguage.value);
            }
        });

        vscode.window.showInformationMessage(`✅ Test cases have been generated successfully in ${
            selectedLanguage.value === 'python' ? 'api_tests.py' :
            selectedLanguage.value === 'java' ? 'ApiTests.java' :
            'api.test.js'
        }`);

    } catch (error) {
        vscode.window.showErrorMessage(`Error generating tests: ${error.message}`);
        console.error("Error details:", error);
    }
}

module.exports = generateTests; 