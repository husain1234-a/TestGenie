const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class FileService {
    static async getAllPythonFiles() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return [];
        }

        const pythonFiles = [];
        for (const folder of workspaceFolders) {
            const pattern = new vscode.RelativePattern(folder, '**/*.py');
            const files = await vscode.workspace.findFiles(pattern);
            pythonFiles.push(...files);
        }
        return pythonFiles;
    }

    static findImports(fileContent) {
        const importRegex = /^(?:from\s+([\w.]+)\s+import\s+[\w\s,]+|import\s+([\w.]+))/gm;
        const imports = [];
        let match;

        while ((match = importRegex.exec(fileContent)) !== null) {
            const importPath = match[1] || match[2];
            if (importPath) {
                imports.push(importPath);
            }
        }
        return imports;
    }

    static async getImportedFilesContent(imports, workspaceFolders) {
        const importedContents = {};

        for (const importPath of imports) {
            // Convert import path to file path
            const possiblePaths = [
                importPath.replace(/\./g, '/') + '.py',
                importPath.replace(/\./g, '/') + '/__init__.py'
            ];

            for (const folder of workspaceFolders) {
                for (const possiblePath of possiblePaths) {
                    const filePath = path.join(folder.uri.fsPath, possiblePath);
                    if (fs.existsSync(filePath)) {
                        const content = fs.readFileSync(filePath, 'utf8');
                        importedContents[importPath] = content;
                        break;
                    }
                }
            }
        }

        return importedContents;
    }

    static async getRelevantFiles(projectType) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            console.log('No workspace folders found');
            return [];
        }

        console.log('Workspace folders:', workspaceFolders.map(f => f.uri.fsPath));
        const relevantFiles = [];

        // Define patterns to exclude
        const excludePatterns = [
            // Directories to exclude
            '**/test/**',
            '**/tests/**',
            '**/models/**',
            '**/schemas/**',
            '**/__pycache__/**',
            '**/node_modules/**',
            '**/dist/**',
            '**/venv/**',
            '**/.venv/**',
            '**/target/**',
            '**/build/**',
            '**/migrations/**',
            '**/templates/**',
            '**/static/**',
            '**/config/**',
            '**/docs/**',
            '**/conda/**',
            '**/env/**',
            '**/envs/**',
            '**/environments/**',
            '**/environments/**',
            '**/environments/**',
            '**/environments/**',
            '**/conda-envs/**',
            '**/.conda/**',
            '**/.conda-envs/**',
            '**/.env/**',
            '**/.envs/**',
            '**/.environments/**',
            '**/.conda-envs/**',


            // Specific files to exclude
            '**/__init__.py',
            '**/run.py',
            '**/main.py',
            '**/application.py',
            '**/app.py',
            '**/wsgi.py',
            '**/manage.py',
            '**/settings.py',
            '**/urls.py',
            '**/config.py',
            '**/setup.py'
        ];

        for (const folder of workspaceFolders) {
            let pattern;
            if (projectType === 'python') {
                pattern = '**/*.py';
            } else if (projectType === 'java') {
                pattern = '**/*.java';
            } else if (projectType === 'nodejs') {
                pattern = '**/*.js';
            }

            if (pattern) {
                try {
                    console.log(`Searching for files with pattern: ${pattern} in ${folder.uri.fsPath}`);

                    // Get all files first, excluding the specified patterns
                    const allFiles = await vscode.workspace.findFiles(
                        new vscode.RelativePattern(folder, pattern),
                        `{${excludePatterns.join(',')}}`
                    );

                    console.log(`Found ${allFiles.length} total files before filtering`);

                    // Filter files based on path and additional criteria
                    const filteredFiles = allFiles.filter(file => {
                        const relativePath = path.relative(folder.uri.fsPath, file.fsPath).toLowerCase();
                        console.log(`Checking file: ${relativePath}`);

                        // Check if file is in repository, service, utils, or routes directory
                        const isRelevant =
                            relativePath.includes('repository') ||
                            relativePath.includes('repositories') ||
                            relativePath.includes('service') ||
                            relativePath.includes('services') ||
                            relativePath.includes('util') ||
                            relativePath.includes('utils') ||
                            relativePath.includes('helper') ||
                            relativePath.includes('helpers') ||
                            relativePath.includes('routes');

                        // Additional check to ensure file is not in excluded directories
                        const isExcluded = excludePatterns.some(pattern => {
                            const normalizedPattern = pattern.replace(/\*\*/g, '.*').replace(/\//g, '[\\\\/]');
                            const regex = new RegExp(normalizedPattern, 'i');
                            return regex.test(relativePath);
                        });

                        console.log(`File ${relativePath} is ${isRelevant && !isExcluded ? 'relevant' : 'not relevant'}`);
                        return isRelevant && !isExcluded;
                    });

                    console.log(`Found ${filteredFiles.length} relevant files after filtering`);
                    relevantFiles.push(...filteredFiles);
                } catch (error) {
                    console.error('Error finding files:', error);
                }
            }
        }

        return relevantFiles;
    }

    static parseContractFile(fileContent, fileExtension) {
        try {
            if (fileExtension === '.json') {
                return JSON.parse(fileContent);
            } else if (fileExtension === '.yaml' || fileExtension === '.yml') {
                return yaml.load(fileContent);
            }
            throw new Error('Unsupported file format');
        } catch (error) {
            throw new Error(`Error parsing contract file: ${error.message}`);
        }
    }

    static async writeTestFile(testFilePath, content) {
        try {
            console.log('FileService: Writing test file to:', testFilePath);
            const testDirPath = path.dirname(testFilePath);
            console.log('FileService: Test directory path:', testDirPath);
            
            // Create the tests directory if it doesn't exist
            if (!fs.existsSync(testDirPath)) {
                console.log('FileService: Creating test directory...');
                try {
                    fs.mkdirSync(testDirPath, { recursive: true });
                    console.log('FileService: Test directory created successfully');
                } catch (mkdirError) {
                    console.error('FileService: Error creating test directory:', mkdirError);
                    throw new Error(`Failed to create test directory: ${mkdirError.message}`);
                }
            }
            
            console.log('FileService: Writing file content...');
            try {
                fs.writeFileSync(testFilePath, content);
                console.log('FileService: File written successfully');
            } catch (writeError) {
                console.error('FileService: Error writing file:', writeError);
                throw new Error(`Failed to write test file: ${writeError.message}`);
            }
        } catch (error) {
            console.error('FileService: Error in writeTestFile:', error);
            throw error;
        }
    }
}

module.exports = FileService; 