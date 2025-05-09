const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const AIService = require('../services/aiService');
const FileService = require('../services/fileService');

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

            progress.report({ message: "Initializing AI model...", increment: 30 });

            // Initialize AI service
            const aiService = new AIService(apiKey);

            progress.report({ message: "Analyzing results with Gemini...", increment: 40 });

            // Generate analysis using Gemini
            const analysis = await aiService.analyzeTestResults(testResults);

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