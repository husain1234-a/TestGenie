const vscode = require('vscode');
const ChatPanel = require('../webviews/chatPanel');

async function chat(context, apiKey) {
    if (!apiKey) {
        vscode.window.showErrorMessage('API key not found. Please configure the extension.');
        return;
    }

    ChatPanel.createOrShow(context.extensionUri, apiKey);
}

module.exports = chat; 