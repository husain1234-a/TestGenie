const vscode = require('vscode');
const ChatPanel = require('../webviews/chatPanel');
const AIService = require('../services/aiService');

async function explainCode(context, apiKey) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active text editor found');
        return;
    }

    const selectedText = editor.document.getText(editor.selection);
    if (!selectedText) {
        vscode.window.showErrorMessage('No code selected. Please select some code to explain.');
        return;
    }

    if (ChatPanel.currentPanel) {
        ChatPanel.currentPanel.dispose();
    }

    // Create or show chat panel
    ChatPanel.createOrShow(context.extensionUri, apiKey);

    // Initialize AI service
    const aiService = new AIService(apiKey);

    try {
        // Generate explanation
        const explanation = await aiService.explainCode(selectedText);

        // Show the selected code in the chat
        ChatPanel.currentPanel.panel.webview.postMessage({
            command: 'initialize',
            text: `Selected code:\n\`\`\`\n${selectedText}\n\`\`\``
        });

        // Send the explanation to the chat
        ChatPanel.currentPanel.panel.webview.postMessage({
            command: 'receiveMessage',
            text: explanation
        });

    } catch (error) {
        console.error('AI Response Error:', error);
        vscode.window.showErrorMessage('Failed to explain code: ' + error.message);
    }
}

module.exports = explainCode; 