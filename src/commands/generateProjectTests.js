const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const AIService = require('../services/aiService');
const FileService = require('../services/fileService');
const { detectProjectType, getTestFilePath } = require('../utils/projectUtils');
const { getProjectStructure } = require('../utils/projectUtils');

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
            // Run pytest with verbose output and generate report
            terminal.sendText('python -m pytest -v --junitxml=test-results.xml');
        },
        java: async () => {
            // Check if it's a Maven project
            if (fs.existsSync(path.join(workspaceRoot, 'pom.xml'))) {
                terminal.sendText('mvn test -Dtest=*Test');
            } else {
                // Fallback to direct JUnit execution with XML report
                terminal.sendText('javac -cp .:junit-4.13.2.jar:hamcrest-core-1.3.jar *.java && java -cp .:junit-4.13.2.jar:hamcrest-core-1.3.jar org.junit.runner.JUnitCore -xml test-results.xml');
            }
        },
        nodejs: async () => {
            // Check if package.json exists and has test script
            const packageJsonPath = path.join(workspaceRoot, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                if (packageJson.scripts && packageJson.scripts.test) {
                    terminal.sendText('npm test -- --reporters=default --reporters=jest-junit');
                } else {
                    // Add test script if missing
                    terminal.sendText('npm install --save-dev jest jest-junit && npm pkg set scripts.test="jest --reporters=default --reporters=jest-junit" && npm test');
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




async function generateProjectTests(context, apiKey) {
    try {
        console.log('Starting project test generation...');
        // Show progress indicator
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating Project Tests",
            cancellable: false
        }, async (progress) => {
            progress.report({ message: "Detecting project type..." });
            console.log('Detecting project type...');

            // Detect project type
            const projectType = await detectProjectType();
            console.log('Detected project type:', projectType);
            if (!projectType) {
                throw new Error('Could not detect project type. Please ensure you have Python, Java, or Node.js files in your workspace.');
            }

            progress.report({ message: "Finding relevant files..." });
            console.log('Finding relevant files...');

            // Get relevant files
            const relevantFiles = await FileService.getRelevantFiles(projectType);
            console.log('Found relevant files:', relevantFiles.map(f => f.fsPath));
            if (relevantFiles.length === 0) {
                throw new Error('No relevant files found for test generation.');
            }

            // Initialize AI service
            const aiService = new AIService(apiKey);
            console.log('AI service initialized');

            // Process each file
            for (let i = 0; i < relevantFiles.length; i++) {
                const file = relevantFiles[i];
                const fileName = path.basename(file.fsPath);
                console.log(`Processing file ${i + 1}/${relevantFiles.length}: ${fileName}`);

                progress.report({
                    message: `Processing file ${i + 1}/${relevantFiles.length}: ${fileName}`,
                    increment: (100 / relevantFiles.length)
                });

                try {
                    // Read file content
                    console.log('Reading file content...');
                    const fileContent = fs.readFileSync(file.fsPath, 'utf8');
                    console.log('File content read successfully');

                    // Get project structure for this file
                    const projectStructure = await getProjectStructure();
                    console.log('Project structure retrieved');

                    // For Python files, get imported files content
                    let importedFilesContent = '';
                    if (projectType === 'python') {
                        console.log('Processing Python imports...');
                        const imports = FileService.findImports(fileContent);
                        const workspaceFolders = vscode.workspace.workspaceFolders;
                        if (workspaceFolders) {
                            const importedContents = await FileService.getImportedFilesContent(imports, workspaceFolders);
                            importedFilesContent = Object.entries(importedContents)
                                .map(([importPath, content]) => `\n# Content of imported file: ${importPath}\n${content}`)
                                .join('\n\n');
                        }
                    }

                    // Generate test cases with project structure
                    console.log('Generating test cases...');
                    let generatedTests = await aiService.generateTestCases(fileContent, projectType, importedFilesContent, projectStructure);
                    if (!generatedTests) {
                        throw new Error('No test cases were generated');
                    }
                    console.log('Test cases generated successfully');

                    // Clean up the response
                    generatedTests = generatedTests.replace(/^```[\w-]*\n/g, '');
                    generatedTests = generatedTests.replace(/\n```$/g, '');

                    // Determine test file path maintaining directory structure
                    console.log('Determining test file path...');
                    const { testDirPath, testFilePath } = getTestFilePath(file.fsPath, projectType);
                    if (!testFilePath) {
                        throw new Error('Could not determine test file path');
                    }
                    console.log('Test file path:', testFilePath);

                    // Write test file
                    console.log('Writing test file...');
                    await FileService.writeTestFile(testFilePath, generatedTests);
                    console.log('Test file written successfully');

                    // Log the test file creation
                    console.log(`Created test file: ${testFilePath}`);

                } catch (error) {
                    const errorMessage = `Error processing file ${fileName}: ${error.message}`;
                    console.error(errorMessage);
                    vscode.window.showErrorMessage(errorMessage);
                    // Continue with next file even if one fails
                }
            }

            // Ask user if they want to run the tests
            const runTestsResponse = await vscode.window.showQuickPick(
                ['Yes', 'No'],
                {
                    placeHolder: 'Would you like to run all the generated tests?',
                    title: 'Run Tests'
                }
            );

            if (runTestsResponse === 'Yes') {
                await runTests(null, projectType);
            }
        });

        vscode.window.showInformationMessage('✅ Project test cases generated successfully!');

    } catch (error) {
        vscode.window.showErrorMessage(`Error generating project tests: ${error.message}`);
        console.error("Error details:", error);
    }
}

module.exports = generateProjectTests; 