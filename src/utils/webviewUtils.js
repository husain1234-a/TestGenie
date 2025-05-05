function getWebviewContent() {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js"></script>
            <style>
                :root {
                    --primary-color: #2563eb;
                    --primary-hover: #1d4ed8;
                    --bg-color: #f8fafc;
                    --chat-bg: #ffffff;
                    --user-msg-bg: #f1f5f9;
                    --ai-msg-bg: #e0e7ff;
                    --text-primary: #1e293b;
                    --text-secondary: #475569;
                    --border-color: #e2e8f0;
                    --input-bg: #ffffff;
                    --button-hover: #1e40af;
                    --code-bg: #f8fafc;
                    --blockquote-bg: #f1f5f9;
                    --scrollbar-thumb: #cbd5e1;
                    --scrollbar-track: #f1f5f9;
                }
 
                body {
                    margin: 0;
                    padding: 16px;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    background-color: var(--bg-color);
                    color: var(--text-primary);
                    line-height: 1.6;
                }
 
                #chat-container {
                    height: calc(100vh - 140px);
                    overflow-y: auto;
                    margin-bottom: 16px;
                    padding: 16px;
                    background-color: var(--chat-bg);
                    border-radius: 12px;
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                }
 
                #chat-container::-webkit-scrollbar {
                    width: 8px;
                }
 
                #chat-container::-webkit-scrollbar-track {
                    background: var(--scrollbar-track);
                    border-radius: 4px;
                }
 
                #chat-container::-webkit-scrollbar-thumb {
                    background: var(--scrollbar-thumb);
                    border-radius: 4px;
                }
 
                .message {
                    margin: 16px 0;
                    padding: 16px;
                    border-radius: 12px;
                    box-shadow: 0 2px 4px rgb(0 0 0 / 0.05);
                    transition: transform 0.2s ease;
                }
 
                .message:hover {
                    transform: translateY(-1px);
                }
 
                .user-message {
                    background-color: var(--user-msg-bg);
                    border: 1px solid var(--border-color);
                    margin-left: 20%;
                }
 
                .ai-message {
                    background-color: var(--ai-msg-bg);
                    color: var(--text-primary);
                    margin-right: 20%;
                }
 
                #input-container {
                    position: fixed;
                    bottom: 16px;
                    left: 16px;
                    right: 16px;
                    display: flex;
                    gap: 12px;
                    background-color: var(--bg-color);
                    padding: 16px;
                    border-top: 1px solid var(--border-color);
                }
 
                #message-input {
                    flex-grow: 1;
                    padding: 12px 16px;
                    border: 2px solid var(--border-color);
                    border-radius: 8px;
                    background-color: var(--input-bg);
                    color: var(--text-primary);
                    font-size: 16px;
                    transition: border-color 0.2s ease;
                }
 
                #message-input:focus {
                    outline: none;
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 3px rgb(37 99 235 / 0.1);
                }
 
                button {
                    padding: 12px 24px;
                    background-color: var(--primary-color);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
 
                button:hover {
                    background-color: var(--button-hover);
                    transform: translateY(-1px);
                }
 
                button:active {
                    transform: translateY(0);
                }
 
                .markdown-content {
                    line-height: 1.7;
                }
                .markdown-content pre code {
                    color: black;
                }
                .markdown-content code {
                    background-color: var(--code-bg);
                    padding: 0.2em 0.4em;
                    border-radius: 4px;
                    font-family: 'Fira Code', monospace;
                    font-size: 0.9em;
                }
 
                .markdown-content pre {
                    background-color: var(--code-bg);
                    padding: 1.2em;
                    border-radius: 8px;
                    overflow-x: auto;
                    border: 1px solid var(--border-color);
                }
 
                .markdown-content pre code {
                    padding: 0;
                    background-color: transparent;
                }
 
                .markdown-content h1,
                .markdown-content h2,
                .markdown-content h3,
                .markdown-content h4 {
                    color: var(--text-primary);
                    margin-top: 1.5em;
                    margin-bottom: 0.75em;
                }
 
                .markdown-content blockquote {
                    background-color: var(--blockquote-bg);
                    border-left: 4px solid var(--primary-color);
                    margin: 1.5em 0;
                    padding: 1em;
                    border-radius: 0 8px 8px 0;
                }
            </style>
        </head>
        <body>
            <div id="chat-container"></div>
            <div id="input-container">
                <input type="text" id="message-input" placeholder="Type your message...">
                <button id="send-button">Send</button>
            </div>
 
            <script>
                const vscode = acquireVsCodeApi();
                const chatContainer = document.getElementById('chat-container');
                const messageInput = document.getElementById('message-input');
                const sendButton = document.getElementById('send-button');
 
                function addMessage(text, type) {
                    const messageDiv = document.createElement('div');
                    messageDiv.className = 'message ' + type + '-message';
 
                    const contentDiv = document.createElement('div');
                    contentDiv.className = 'markdown-content';
 
                    if (type === 'ai') {
                        marked.setOptions({
                            gfm: true,
                            breaks: true,
                            sanitize: false
                        });
                        contentDiv.innerHTML = marked.parse(text);
                    } else {
                        contentDiv.textContent = text;
                    }
 
                    messageDiv.appendChild(contentDiv);
                    chatContainer.appendChild(messageDiv);
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                }
 
                function sendMessage() {
                    const text = messageInput.value.trim();
                    if (text) {
                        addMessage(text, 'user');
                        vscode.postMessage({
                            command: 'sendMessage',
                            text: text
                        });
                        messageInput.value = '';
                    }
                }
 
                // Handle Enter key
                messageInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault(); // Prevent default to avoid newline
                        sendMessage();
                    }
                });
 
                // Handle button click
                sendButton.addEventListener('click', sendMessage);
 
                // Handle messages from extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'initialize':
                            addMessage(message.text, 'user');
                            break;
                        case 'receiveMessage':
                            addMessage(message.text, 'ai');
                            break;
                    }
                });
            </script>
        </body>
        </html>
    `;
}

module.exports = {
    getWebviewContent
}; 