const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

async function getApiKey(context) {
    const secrets = context.secrets;
    let apiKey = await secrets.get('geminiApiKey');

    if (!apiKey) {
        const newApiKey = await vscode.window.showInputBox({
            prompt: 'Enter your API key:',
            placeHolder: 'Paste your API key here',
            ignoreFocusOut: true,
            password: true
        });

        if (newApiKey) {
            await secrets.store('geminiApiKey', newApiKey);
            apiKey = newApiKey;
        }
    }

    return apiKey;
}

async function detectProjectType() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return null;

    const fileCounts = {
        python: 0,
        java: 0,
        nodejs: 0
    };

    for (const folder of workspaceFolders) {
        // Check for Python files
        const pythonFiles = await vscode.workspace.findFiles(
            new vscode.RelativePattern(folder, '**/*.py')
        );
        fileCounts.python += pythonFiles.length;

        // Check for Java files
        const javaFiles = await vscode.workspace.findFiles(
            new vscode.RelativePattern(folder, '**/*.java')
        );
        fileCounts.java += javaFiles.length;

        // Check for Node.js files
        const nodeFiles = await vscode.workspace.findFiles(
            new vscode.RelativePattern(folder, '**/*.js')
        );
        fileCounts.nodejs += nodeFiles.length;
    }

    // Return the language with most files
    const maxCount = Math.max(...Object.values(fileCounts));
    if (maxCount === 0) return null;

    return Object.keys(fileCounts).find(key => fileCounts[key] === maxCount);
}

function getTestFilePath(sourceFilePath, projectType) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return null;

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const relativePath = path.relative(workspaceRoot, sourceFilePath);
    const dirName = path.dirname(relativePath);
    const fileName = path.basename(sourceFilePath, path.extname(sourceFilePath));

    // Create test file name based on project type
    const testFileExtensions = {
        python: '_test.py',
        java: 'Test.java',
        nodejs: '.test.js'
    };

    // Create test directory path
    const testDirPath = path.join(workspaceRoot, 'tests', dirName);

    // Create test file path
    const testFileName = `${fileName}${testFileExtensions[projectType]}`;
    const testFilePath = path.join(testDirPath, testFileName);

    return {
        testDirPath,
        testFilePath
    };
}

function generateDirectoryTree(dir, prefix = '', excludeDirs = ['node_modules', '.git', '__pycache__', 'venv', '.env']) {
    let tree = '';
    const items = fs.readdirSync(dir);

    items.forEach((item, index) => {
        const itemPath = path.join(dir, item);
        const isLast = index === items.length - 1;
        const isDirectory = fs.statSync(itemPath).isDirectory();

        // Skip excluded directories
        if (isDirectory && excludeDirs.includes(item)) {
            return;
        }

        const marker = isLast ? '└── ' : '├── ';
        tree += `${prefix}${marker}${item}\n`;

        if (isDirectory) {
            const newPrefix = prefix + (isLast ? '    ' : '│   ');
            tree += generateDirectoryTree(itemPath, newPrefix, excludeDirs);
        }
    });

    return tree;
}

async function getProjectStructure() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        return '';
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    return generateDirectoryTree(workspaceRoot);
}

module.exports = {
    getApiKey,
    detectProjectType,
    getTestFilePath,
    getProjectStructure
}; 