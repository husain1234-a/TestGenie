const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const AIService = require('../services/aiService');
const FileService = require('../services/fileService');

async function findCoverageReport(workspaceRoot) {
    // Common coverage report locations and formats
    const possiblePaths = [
        // Python coverage
        { path: 'coverage.xml', type: 'python' },
        { path: 'htmlcov/index.html', type: 'python' },
        // JavaScript/TypeScript coverage
        { path: 'coverage/coverage-final.json', type: 'js' },
        { path: 'coverage/lcov.info', type: 'js' },
        // Java coverage
        { path: 'target/site/jacoco/jacoco.xml', type: 'java' },
        { path: 'target/site/jacoco/index.html', type: 'java' }
    ];

    for (const { path: coveragePath, type } of possiblePaths) {
        const fullPath = path.join(workspaceRoot, coveragePath);
        if (fs.existsSync(fullPath)) {
            return { path: fullPath, type };
        }
    }

    return null;
}

async function readCoverageData(coverageInfo) {
    if (!coverageInfo) return null;

    try {
        const content = fs.readFileSync(coverageInfo.path, 'utf8');
        return {
            type: coverageInfo.type,
            content
        };
    } catch (error) {
        console.error('Error reading coverage file:', error);
        return null;
    }
}

async function analyzeTestResults(context, apiKey) {
    try {
        // Get workspace root
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }
        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const testResultsPath = path.join(workspaceRoot, 'test-results.xml');

        // Check if test-results.xml exists
        if (!fs.existsSync(testResultsPath)) {
            vscode.window.showErrorMessage('No test-results.xml file found. Please run tests first.');
            return;
        }

        // Show progress indicator
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Analyzing Test Results",
            cancellable: false
        }, async (progress) => {
            progress.report({ message: "Reading test results..." });

            // Read test results file
            const testResults = fs.readFileSync(testResultsPath, 'utf8');

            // Find and read coverage report
            progress.report({ message: "Looking for coverage reports...", increment: 10 });
            const coverageInfo = await findCoverageReport(workspaceRoot);
            const coverageData = coverageInfo ? await readCoverageData(coverageInfo) : null;

            progress.report({ message: "Initializing AI model...", increment: 20 });

            // Initialize AI service
            const aiService = new AIService(apiKey);

            progress.report({ message: "Analyzing results with Gemini...", increment: 40 });

            // Generate analysis using Gemini
            const analysis = await aiService.analyzeTestResults(testResults, coverageData);

            progress.report({ message: "Generating markdown report...", increment: 20 });

            // Create reports directory if it doesn't exist
            const reportsDir = path.join(workspaceRoot, 'reports');
            if (!fs.existsSync(reportsDir)) {
                fs.mkdirSync(reportsDir, { recursive: true });
            }

            // Generate timestamp for the report
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const reportPath = path.join(reportsDir, `test-analysis-${timestamp}.md`);

            // Write the markdown report
            await FileService.writeTestFile(reportPath, analysis);

            progress.report({ message: "Opening report...", increment: 10 });

            // Open the generated report
            const reportDocument = await vscode.workspace.openTextDocument(reportPath);
            await vscode.window.showTextDocument(reportDocument);
        });

        vscode.window.showInformationMessage('✅ Test results analysis completed!');

    } catch (error) {
        vscode.window.showErrorMessage(`Error analyzing test results: ${error.message}`);
        console.error("Error details:", error);
    }
}

module.exports = analyzeTestResults; 