const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const AIService = require('../services/aiService');
const FileService = require('../services/fileService');
const { detectProjectType, getTestFilePath } = require('../utils/projectUtils');

async function generateProjectTests(context, apiKey) {
    try {
        // Show progress indicator
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating Project Tests",
            cancellable: false
        }, async (progress) => {
            progress.report({ message: "Detecting project type..." });

            // Detect project type
            const projectType = await detectProjectType();
            if (!projectType) {
                throw new Error('Could not detect project type. Please ensure you have Python, Java, or Node.js files in your workspace.');
            }

            progress.report({ message: "Finding relevant files..." });

            // Get relevant files
            const relevantFiles = await FileService.getRelevantFiles(projectType);
            if (relevantFiles.length === 0) {
                throw new Error('No relevant files found for test generation.');
            }

            // Initialize AI service
            const aiService = new AIService(apiKey);

            // Process each file
            for (let i = 0; i < relevantFiles.length; i++) {
                const file = relevantFiles[i];
                const fileName = path.basename(file.fsPath);

                progress.report({
                    message: `Processing file ${i + 1}/${relevantFiles.length}: ${fileName}`,
                    increment: (100 / relevantFiles.length)
                });

                try {
                    // Read file content
                    const fileContent = fs.readFileSync(file.fsPath, 'utf8');

                    // For Python files, get imported files content
                    let importedFilesContent = '';
                    if (projectType === 'python') {
                        const imports = FileService.findImports(fileContent);
                        const workspaceFolders = vscode.workspace.workspaceFolders;
                        if (workspaceFolders) {
                            const importedContents = await FileService.getImportedFilesContent(imports, workspaceFolders);
                            importedFilesContent = Object.entries(importedContents)
                                .map(([importPath, content]) => `\n# Content of imported file: ${importPath}\n${content}`)
                                .join('\n\n');
                        }
                    }

                    // Generate test cases
                    let generatedTests = await aiService.generateTestCases(
                        fileContent,
                        projectType,
                        importedFilesContent,
                        file.fsPath
                    );

                    // Clean up the response
                    generatedTests = generatedTests.replace(/^```[\w-]*\n/g, '');
                    generatedTests = generatedTests.replace(/\n```$/g, '');

                    // Determine test file path maintaining directory structure
                    const { testDirPath, testFilePath } = getTestFilePath(file.fsPath, projectType);

                    // Write test file
                    await FileService.writeTestFile(testFilePath, generatedTests);

                    // Log the test file creation
                    console.log(`Created test file: ${testFilePath}`);

                } catch (error) {
                    console.error(`Error processing file ${fileName}:`, error);
                    // Continue with next file even if one fails
                }
            }
        });

        vscode.window.showInformationMessage('✅ Project test cases generated successfully!');

    } catch (error) {
        vscode.window.showErrorMessage(`Error generating project tests: ${error.message}`);
        console.error("Error details:", error);
    }
}

module.exports = generateProjectTests; 