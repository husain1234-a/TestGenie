const vscode = require('vscode');
const { registerCommands } = require('./commands');
const { getApiKey } = require('./utils/projectUtils');

async function activate(context) {
    console.log('TestGenie extension is now active!');

    let apiKey = await getApiKey(context);
    if (!apiKey) {
        vscode.window.showErrorMessage('API key not found. Please configure the extension.');
        return;
    }

    // Register all commands
    const disposables = registerCommands(context, apiKey);
    context.subscriptions.push(...disposables);
}

function deactivate() { }

module.exports = {
    activate,
    deactivate
}; 