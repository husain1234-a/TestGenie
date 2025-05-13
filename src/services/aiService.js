const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getProjectStructure } = require('../utils/projectUtils');

class AIService {
    constructor(apiKey) {
        this.gemini = new GoogleGenerativeAI(apiKey);
        this.model = this.gemini.getGenerativeModel({ model: "gemini-2.0-flash" });
    }

    async generateContent(prompt) {
        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('AI Response Error:', error);
            throw error;
        }
    }

    async generateTestCases(code, language, importedFilesContent = '', filePath = '') {
        const prompt = `Generate comprehensive unit tests for this ${language} code. Include:
        - Test cases for all functions/methods
        - Edge cases and error scenarios
        - Mocking of dependencies where needed
        - Clear test descriptions
        - Setup and teardown if required
        - Cover all possible scenarios
        
        Use the appropriate testing framework:
        - Python: pytest
        - Java: JUnit
        - Node.js: Jest
        
        Important Instructions for Module Imports:
        - DO NOT use placeholder imports like "your_module"
        - For Python files, use the exact module path based on the file location
        - The file being tested is located at: ${filePath}
        - Convert the file path to proper module import path
        - Example: If file is at "app/services/transaction.py", use "from app.services.transaction"
        - Example: If file is at "app/repo/code.py", use "from app.repo.code"
        - Import all other required modules using their full paths
        - Make sure all imports are properly resolved and match the project structure
        
        Here's the code to test:
        
        ${code}
        
        ${importedFilesContent ? `Here are the contents of imported files that might be needed for testing:\n\n${importedFilesContent}` : ''}
        
        Import the libraries, code and methods as needed correctly.
        Give the code as a single file so that I can just copy paste it in one go.
        Provide only the test code with detailed comments. Do not include any other text.`;

        return this.generateContent(prompt);
    }

    async generateApiTests(contract, language) {
        const projectStructure = await getProjectStructure();
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
            
            Here's the project structure to help with imports:
            ${projectStructure}
            
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
            
            Here's the project structure to help with imports:
            ${projectStructure}
            
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
            
            Here's the project structure to help with imports:
            ${projectStructure}
            
            Include appropriate setup, teardown, and mocking as needed. Include necessary imports.
            
            Contract:
            ${JSON.stringify(contract, null, 2)}
            
            Provide only the Node.js test code with detailed comments. Do not include any other text.`
        };

        return this.generateContent(prompts[language]);
    }

    async explainCode(code) {
        const prompt = `Please explain this code in detail, including its purpose, functionality, and any important concepts or patterns used: \n\n${code}`;
        return this.generateContent(prompt);
    }

    async chat(message) {
        const prompt = "If any user asks about you then You are TestGenie a Chat AI developed by Yash Technologies and if user is asking any other question then answer normally dont include your introduction in your response also simply say sorry if user inputs any negative word, the message by user is enclosed under ***user message***. Here is the user message: *** " + message + " ***";
        return this.generateContent(prompt);
    }

    async analyzeTestResults(testResults, coverageData) {
        let prompt = `Analyze this test results XML file and generate a comprehensive markdown report. Include:

1. Test Summary
   - Total number of tests
   - Number of passed tests
   - Number of failed tests
   - Overall pass rate

2. Failed Tests Analysis
   - List of failed tests with their names
   - Error messages and stack traces
   - Potential causes and suggestions for fixes

3. Test Coverage Analysis
   - Identify areas with good test coverage
   - Highlight areas that might need more test coverage
   - Suggest additional test cases if needed

4. Performance Insights
   - Test execution time
   - Slowest tests
   - Suggestions for optimization

5. Recommendations
   - Areas for improvement
   - Best practices to follow
   - Suggestions for test maintenance

Here's the test results XML:

${testResults}`;

        if (coverageData) {
            prompt += `\n\nHere's the coverage data (${coverageData.type} format):\n\n${coverageData.content}`;
        }

        prompt += `\n\nGenerate a well-formatted markdown report with clear sections and bullet points. Use markdown headers, lists, and code blocks where appropriate.`;

        return this.generateContent(prompt);
    }
}

module.exports = AIService; 