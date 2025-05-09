const vscode = require('vscode');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

async function findProductionCodePath(workspacePath) {
    // Common production code directory names
    const possibleDirs = ['src', 'app', 'lib', 'main', 'core'];

    for (const dir of possibleDirs) {
        const dirPath = path.join(workspacePath, dir);
        if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
            return dirPath;
        }
    }

    // If no common directory found, return workspace root
    return workspacePath;
}

async function runTests(context) {
    try {
        // Get the workspace folder
        const workspaceFolder = vscode.workspace.workspaceFolders[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        // Find production code path
        const prodCodePath = await findProductionCodePath(workspaceFolder.uri.fsPath);

        // Create a terminal
        const terminal = vscode.window.createTerminal('TestGenie Tests');
        terminal.show();

        // Change to the workspace directory
        terminal.sendText(`cd "${workspaceFolder.uri.fsPath}"`);

        // Set PYTHONPATH to include production code directory
        const setPythonPath = process.platform === 'win32'
            ? `set PYTHONPATH=${prodCodePath};%PYTHONPATH%`
            : `export PYTHONPATH=${prodCodePath}:$PYTHONPATH`;

        terminal.sendText(setPythonPath);

        // Run pytest command with python -m
        terminal.sendText('python -m pytest tests/ -v');

        vscode.window.showInformationMessage(`Running test cases with PYTHONPATH set to: ${prodCodePath}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Error running tests: ${error.message}`);
    }
}

module.exports = runTests; 