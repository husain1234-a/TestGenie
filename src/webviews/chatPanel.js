const vscode = require('vscode');
const { getWebviewContent } = require('../utils/webviewUtils');
const AIService = require('../services/aiService');

class ChatPanel {
    static currentPanel = undefined;
    static viewType = 'chatbox';

    static createOrShow(extensionUri, apiKey) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ChatPanel.currentPanel) {
            ChatPanel.currentPanel.panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            ChatPanel.viewType,
            'Chat',
            column || vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        ChatPanel.currentPanel = new ChatPanel(panel, extensionUri, apiKey);
    }

    constructor(panel, extensionUri, apiKey) {
        this.panel = panel;
        this.extensionUri = extensionUri;
        this.disposables = [];
        this.aiService = new AIService(apiKey);

        // Set initial HTML content
        this.update();

        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'sendMessage':
                        try {
                            const response = await this.aiService.chat(message.text);
                            this.panel.webview.postMessage({
                                command: 'receiveMessage',
                                text: response
                            });
                        } catch (error) {
                            console.error('AI Response Error:', error);
                            this.panel.webview.postMessage({
                                command: 'receiveMessage',
                                text: `Error: ${error.message || 'Failed to get AI response'}`
                            });
                            vscode.window.showErrorMessage('Failed to get AI response: ' + error.message);
                        }
                        break;
                }
            },
            null,
            this.disposables
        );

        // Clean up on dispose
        this.panel.onDidDispose(
            () => this.dispose(),
            null,
            this.disposables
        );
    }

    update() {
        this.panel.webview.html = getWebviewContent();
    }

    dispose() {
        ChatPanel.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}

module.exports = ChatPanel; 