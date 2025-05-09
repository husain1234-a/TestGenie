const vscode = require('vscode');
const generateTests = require('./generateTests');
const generateUnitTests = require('./generateUnitTests');
const generateProjectTests = require('./generateProjectTests');
const explainCode = require('./explainCode');
const chat = require('./chat');
const runTests = require('./runTests');
const analyzeTestResults = require('./analyzeTestResults');

function registerCommands(context, apiKey) {
    const disposables = [
        vscode.commands.registerCommand('testgenie.generateTest', () => generateTests(context, apiKey)),
        vscode.commands.registerCommand('testgenie.generateUnitTests', () => generateUnitTests(context, apiKey)),
        vscode.commands.registerCommand('testgenie.generateProjectTests', () => generateProjectTests(context, apiKey)),
        vscode.commands.registerCommand('testgenie.explainCode', () => explainCode(context, apiKey)),
        vscode.commands.registerCommand('testGenie.StartChat', () => chat(context, apiKey)),
        vscode.commands.registerCommand('testgenie.runTests', () => runTests(context)),
        vscode.commands.registerCommand('testgenie.analyzeTestResults', () => analyzeTestResults(context, apiKey))
    ];

    return disposables;
}

module.exports = {
    registerCommands
}; 