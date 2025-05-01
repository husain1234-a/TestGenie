const vscode = require('vscode');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');


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
    `};
	class ChatPanel {
		static currentPanel = undefined;
		static viewType = 'chatbox';
	 
		static createOrShow(extensionUri) {
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
	 
			ChatPanel.currentPanel = new ChatPanel(panel, extensionUri);
		}
	 
		constructor(panel, extensionUri) {
			this.panel = panel;
			this.extensionUri = extensionUri;
			this.disposables = [];
	 
			// Set initial HTML content
			this.update();
	 
			// Handle messages from webview
			this.panel.webview.onDidReceiveMessage(
				async message => {
					switch (message.type) {
						case 'message':
							// Process the message and send response
							await this.handleMessage(message.content);
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
	 
		async handleMessage(content) {
			// Here you can process the message and generate a response
			// For example, you could call an API or use a chat service
			const response = `Received: ${content}`;
		   
			// Send response back to webview
			await this.panel.webview.postMessage({
				type: 'response',
				content: response
			});
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


async function activate(context) {
    console.log('TestGenie extension is now active!');

    let apiKey = await getApiKey(context);
    if (!apiKey) {
        vscode.window.showErrorMessage('API key not found. Please configure the extension.');
        return;
    }

    const disposable = vscode.commands.registerCommand('testgenie.generateTest', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('Please open an OpenAPI contract file (JSON or YAML).');
                return;
            }

            // Language selection
            const selectedLanguage = await vscode.window.showQuickPick(
                [
                    { label: 'Python', value: 'python' },
                    { label: 'Java', value: 'java' },
                    { label: 'Node.js', value: 'nodejs' }  // Added Node.js option
                ],
                {
                    placeHolder: 'Select the test language',
                    title: 'Choose Test Language'
                }
            );

            if (!selectedLanguage) {
                return; // User cancelled the selection
            }

            // Start the progress indicator
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Generating Test Cases",
                cancellable: false
            }, async (progress) => {
                progress.report({ message: "Parsing OpenAPI contract..." });

                const document = editor.document;
                const fileContent = document.getText();
                const fileExtension = path.extname(document.fileName).toLowerCase();

                let contract;
                try {
                    if (fileExtension === '.json') {
                        contract = JSON.parse(fileContent);
                    } else if (fileExtension === '.yaml' || fileExtension === '.yml') {
                        contract = yaml.load(fileContent);
                    } else {
                        vscode.window.showErrorMessage('Please open a valid OpenAPI contract file (JSON or YAML).');
                        return;
                    }
                } catch (error) {
                    vscode.window.showErrorMessage(`Error parsing contract file: ${error.message}`);
                    return;
                }

                progress.report({ message: "Initializing AI model...", increment: 30 });

                // Initialize Gemini
                const gemini = new GoogleGenerativeAI(apiKey);
                const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });

                progress.report({ message: "Generating test cases...", increment: 40 });

                // Create language-specific prompt
                const prompts = {
                    python: `Generate Python test cases using pytest for this OpenAPI contract. Include edge cases, validation testing, and error scenarios.
                    Focus on:
					- Happy path testing
					- Error scenarios
                    - Path parameter validation
                    - Request body validation
                    - Authorization header testing
                    - Response status code verification
                    - Response body validation
                    - Error handling
                    
                    Contract:
                    ${JSON.stringify(contract, null, 2)}
                    
                    Provide only the Python test code with detailed comments. Do not include any other text.`,
                    
                    java: `Generate Java test cases using JUnit 5 Mockito for this OpenAPI contract. Include edge cases, validation testing, and error scenarios.
                    Focus on:
					- Happy path testing
					- Error scenarios
                    - Path parameter validation
                    - Request body validation
                    - Authorization header testing
                    - Response status code verification
                    - Response body validation
                    - Error handling
                    
                    Use RestAssured for API testing and include necessary imports.
                    
                    Contract:
                    ${JSON.stringify(contract, null, 2)}
                    
                    Provide only the Java test code with detailed comments. Do not include any other text.`,
                    
                    nodejs: `Generate Node.js test cases using Jest and Supertest for this OpenAPI contract. Include edge cases, validation testing, and error scenarios.
                    Focus on:
					- Happy path testing
					- Error scenarios
                    - Path parameter validation
                    - Request body validation
                    - Authorization header testing
                    - Response status code verification
                    - Response body validation
                    - Error handling
                    
                    Include appropriate setup, teardown, and mocking as needed. Include necessary imports.
                    
                    Contract:
                    ${JSON.stringify(contract, null, 2)}
                    
                    Provide only the Node.js test code with detailed comments. Do not include any other text.`
                };

                const result = await model.generateContent(prompts[selectedLanguage.value]);
                const response = await result.response;
                let generatedTests = response.text();

                generatedTests = generatedTests.replace(/^```(python|java|javascript|js)\n/g, '');
                generatedTests = generatedTests.replace(/\n```$/g, '');
                generatedTests = generatedTests.replace(/```/g, '');

                if (!generatedTests) {
                    vscode.window.showErrorMessage('No test cases were generated.');
                    return;
                }
                progress.report({ message: "Writing test file...", increment: 20 });

                // Create file with appropriate extension
                const currentDir = path.dirname(document.fileName);
                const fileExtensions = {
                    python: 'py',
                    java: 'java',
                    nodejs: 'js'
                };
                
                // Set appropriate test file name based on language
                let testFileName;
                if (selectedLanguage.value === 'java') {
                    testFileName = 'ApiTests.java';
                } else if (selectedLanguage.value === 'nodejs') {
                    testFileName = 'api.test.js';
                } else {
                    testFileName = 'api_tests.py';
                }
                
                const testFilePath = path.join(currentDir, testFileName);

                // Add appropriate headers based on language
                let finalContent;
                if (selectedLanguage.value === 'java') {
                    finalContent = generatedTests;  // Java files don't need additional comments at the top
                } else if (selectedLanguage.value === 'nodejs') {
                    finalContent = `// Generated test cases for ${path.basename(document.fileName)}
// Using Jest and Supertest frameworks
${generatedTests}`;
                } else {
                    finalContent = `# Generated test cases for ${path.basename(document.fileName)}
${generatedTests}`;
                }

                // Write to file
                fs.writeFileSync(testFilePath, finalContent);

                progress.report({ message: "Opening generated tests...", increment: 10 });

                // Open the generated file
                const testDocument = await vscode.workspace.openTextDocument(testFilePath);
                await vscode.window.showTextDocument(testDocument);
            });

            vscode.window.showInformationMessage(`✅ Test cases have been generated successfully in ${{
                'python': 'api_tests.py',
                'java': 'ApiTests.java',
                'nodejs': 'api.test.js'
            }[selectedLanguage.value]}`);

        } catch (error) {
            vscode.window.showErrorMessage(`Error generating tests: ${error.message}`);
            console.error("Error details:", error);
        }
    });
    let chatbox = vscode.commands.registerCommand('testGenie.StartChat', async () => {
        // Get API key first
        let apiKey = await getApiKey(context);
        if (!apiKey) {
            vscode.window.showErrorMessage('API key not found. Please configure the extension.');
            return;
        }
        if(ChatPanel.currentPanel){
            ChatPanel.currentPanel.dispose();
        }

        if (!ChatPanel.currentPanel) {
            ChatPanel.currentPanel = vscode.window.createWebviewPanel(
                'TestGenie Chat',
                'TestGenie Chat',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                }
            );

            ChatPanel.currentPanel.onDidDispose(
                () => {
                    ChatPanel.currentPanel = undefined;
                },
                null,
                context.subscriptions
            );
        }

        ChatPanel.currentPanel.webview.html = getWebviewContent();

        // Initialize Gemini instance
        const gemini = new GoogleGenerativeAI(apiKey);
        const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });

        ChatPanel.currentPanel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'sendMessage':
                        try {
                            // Show loading state in UI if needed
                            const prompt = "If any user asks about you then You are TestGenie a Chat AI developed by Yash Technologies and if user is asking any other question then answer normally dont include your introduction in your response also simply say sorry if user inputs any negative word, the message by user is enclosed under ***user message***. Here is the user message: *** " +message.text+" ***";
                            const result = await model.generateContent(prompt);
                            const response = await result.response;
                            const generatedText = response.text();

                            // Send response back to webview
                            ChatPanel.currentPanel?.webview.postMessage({
                                command: 'receiveMessage',
                                text: generatedText
                            });
                        } catch (error) {
                            console.error('AI Response Error:', error);
                            ChatPanel.currentPanel?.webview.postMessage({
                                command: 'receiveMessage',
                                text: `Error: ${error.message || 'Failed to get AI response'}`
                            });
                            vscode.window.showErrorMessage('Failed to get AI response: ' + error.message);
                        }
                        break;
                }
            },
            undefined,
            context.subscriptions
        );

    });

    let explainCode = vscode.commands.registerCommand('testgenie.explainCode', async () => {
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
        if(ChatPanel.currentPanel){
            ChatPanel.currentPanel.dispose();
        }
        // Create or show chat panel
        if (!ChatPanel.currentPanel) {
            ChatPanel.currentPanel = vscode.window.createWebviewPanel(
                'TestGenie Chat',
                'TestGenie Chat',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                }
            );

            ChatPanel.currentPanel.onDidDispose(
                () => {
                    ChatPanel.currentPanel = undefined;
                },
                null,
                context.subscriptions
            );
        }

        ChatPanel.currentPanel.webview.html = getWebviewContent();

        // Initialize Gemini instance
        const gemini = new GoogleGenerativeAI(apiKey);
        const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Set up message handling
        ChatPanel.currentPanel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'sendMessage':
                        try {
                            const prompt = "If any user asks about you then You are TestGenie a Chat AI developed by Yash Technologies and if user is asking anyother question then answer normally dont include your introduction in your response the message by user is enclosed under ***user message***. Here is the user message: *** " + message.text + " ***";
                            const result = await model.generateContent(prompt);
                            const response = await result.response;
                            const generatedText = response.text();

                            ChatPanel.currentPanel?.webview.postMessage({
                                command: 'receiveMessage',
                                text: generatedText
                            });
                        } catch (error) {
                            console.error('AI Response Error:', error);
                            ChatPanel.currentPanel?.webview.postMessage({
                                command: 'receiveMessage',
                                text: `Error: ${error.message || 'Failed to get AI response'}`
                            });
                            vscode.window.showErrorMessage('Failed to get AI response: ' + error.message);
                        }
                        break;
                }
            },
            undefined,
            context.subscriptions
        );

        // Generate initial explanation for selected code
        try {
            const prompt = `Please explain this code in detail, including its purpose, functionality, and any important concepts or patterns used: \n\n${selectedText}`;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const explanation = response.text();

             // Also show the selected code in the chat
             ChatPanel.currentPanel.webview.postMessage({
                command: 'initialize',
                text: `Selected code:\n\`\`\`\n${selectedText}\n\`\`\``
            });
            
            // Send the explanation to the chat
            ChatPanel.currentPanel.webview.postMessage({
                command: 'receiveMessage',
                text: explanation
            });

           
        } catch (error) {
            console.error('AI Response Error:', error);
            vscode.window.showErrorMessage('Failed to explain code: ' + error.message);
        }
    });

    let generateUnitTests = vscode.commands.registerCommand('testgenie.generateUnitTests', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('Please open a code file to generate unit tests.');
                return;
            }

            const document = editor.document;
            const fileContent = document.getText();
            const fileName = path.basename(document.fileName);
            const fileExtension = path.extname(document.fileName).toLowerCase();

            // Language detection based on file extension
            const languageMap = {
                '.js': 'javascript',
                '.ts': 'typescript',
                '.py': 'python',
                '.java': 'java',
                '.cs': 'csharp',
                '.go': 'go',
                '.rb': 'ruby',
                '.php': 'php'
            };

            const language = languageMap[fileExtension];
            if (!language) {
                vscode.window.showErrorMessage('Unsupported file type for test generation.');
                return;
            }

            // For JavaScript files, ask if they want Node.js tests specifically
            let testFramework = '';
            if (language === 'javascript') {
                const testTypeSelection = await vscode.window.showQuickPick(
                    [
                        { label: 'Jest (Standard JavaScript)', value: 'jest' },
                        { label: 'Node.js (with Mocha/Chai)', value: 'nodejs' }
                    ],
                    {
                        placeHolder: 'Select test framework',
                        title: 'Choose Test Framework'
                    }
                );
                
                if (!testTypeSelection) {
                    return; // User cancelled
                }
                
                testFramework = testTypeSelection.value;
            }

            // Show progress indicator
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Generating Unit Tests",
                cancellable: false
            }, async (progress) => {
                progress.report({ message: "Analyzing code..." });

                // Get API key
                let apiKey = await getApiKey(context);
                if (!apiKey) {
                    throw new Error('API key not found');
                }

                progress.report({ message: "Initializing AI model...", increment: 30 });

                // Initialize Gemini
                const gemini = new GoogleGenerativeAI(apiKey);
                const model = gemini.getGenerativeModel({ model: "gemini-2.0-flash" });

                progress.report({ message: "Generating test cases...", increment: 40 });

                // Create language-specific prompt
                let prompt;
                
                if (language === 'javascript' && testFramework === 'nodejs') {
                    // Special prompt for Node.js with Mocha/Chai
                    prompt = `Generate comprehensive unit tests for this Node.js code. Include:
                    - Test cases for all functions/methods
                    - Edge cases and error scenarios
                    - Mocking of dependencies where needed
                    - Mocking of database connections where needed
                    - Clear test descriptions
                    - Setup and teardown if required
                    - Cover all possible scenarios
                    
                    Use Mocha as the test framework and Chai for assertions. Use Sinon for mocking if needed.
                    
                    Here's the code to test:
                    
                    ${fileContent}
                    
                    Import the libraries, code and methods as needed correctly.
                    Give the code as a single file so that I can just copy paste it in one go.
                    Provide only the test code with detailed comments. Do not include any other text.`;
                } else {
                    // Standard prompt for other languages
                    prompt = `Generate comprehensive unit tests for this ${language} code. Include:
                    - Test cases for all functions/methods
                    - Edge cases and error scenarios
                    - Mocking of dependencies where needed
                    - Mocking of database where needed
                    - Clear test descriptions
                    - Setup and teardown if required
                    - Cover all possible scenarios
                    
                    Use the appropriate testing framework for ${language}:
                    - JavaScript: Jest
                    - Python: pytest
                    - Java: JUnit
                    - C#: NUnit
                    - Go: testing package
                    - Ruby: RSpec
                    - PHP: PHPUnit
                    
                    Here's the code to test:
                    
                    ${fileContent}
                    
                    Import the libraries code and methods as needed correctly.
                    Give the code as a single file dont give part by part code so that I can just copy paste in a single time
                    Provide only the test code with detailed comments. Do not include any other text.`;
                }

                const result = await model.generateContent(prompt);
                const response = await result.response;
                let generatedTests = response.text();

                // Clean up the response
                generatedTests = generatedTests.replace(/^```[\w-]*\n/g, '');
                generatedTests = generatedTests.replace(/\n```$/g, '');

                progress.report({ message: "Writing test file...", increment: 20 });

                // Determine test file name based on language
                const testFileExtensions = {
                    javascript: language === 'javascript' && testFramework === 'nodejs' ? '.spec.js' : '.test.js',
                    typescript: '.test.ts',
                    python: '_test.py',
                    java: 'Test.java',
                    csharp: 'Tests.cs',
                    go: '_test.go',
                    ruby: '_spec.rb',
                    php: 'Test.php'
                };

                const baseFileName = fileName.replace(fileExtension, '');
                const testFileName = `${baseFileName}${testFileExtensions[language]}`;
                const testFilePath = path.join(path.dirname(document.fileName), testFileName);

                // Write test file
                fs.writeFileSync(testFilePath, generatedTests);

                progress.report({ message: "Opening generated tests...", increment: 10 });

                // Open the generated file
                const testDocument = await vscode.workspace.openTextDocument(testFilePath);
                await vscode.window.showTextDocument(testDocument, {
                    viewColumn: vscode.ViewColumn.Beside
                });
            });

            vscode.window.showInformationMessage('✅ Unit tests generated successfully!');

        } catch (error) {
            vscode.window.showErrorMessage(`Error generating unit tests: ${error.message}`);
            console.error("Error details:", error);
        }
    });

    context.subscriptions.push(generateUnitTests);
    context.subscriptions.push(chatbox);

    context.subscriptions.push(explainCode);

    context.subscriptions.push(disposable);
	
}
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

function deactivate() {}

module.exports = {
    activate,
    deactivate
};