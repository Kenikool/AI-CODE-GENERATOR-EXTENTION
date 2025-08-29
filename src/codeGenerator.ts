import * as vscode from 'vscode';
import { AIProvider, AIMessage } from './aiProvider';

export class CodeGenerator {
    constructor(private aiProvider: AIProvider) {}

    public async generateCode(
        prompt: string,
        editor: vscode.TextEditor,
        cancellationToken?: vscode.CancellationToken
    ): Promise<string> {
        const context = this.getEditorContext(editor);
        const language = this.getLanguageFromEditor(editor);
        
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are an expert ${language} developer. Generate clean, efficient, and well-documented code based on the user's request. Only return the code without explanations unless specifically asked.`
            },
            {
                role: 'user',
                content: `Context: I'm working in a ${language} file.
Current file content (last 20 lines):
\`\`\`${language}
${context}
\`\`\`

Request: ${prompt}

Please generate the requested code in ${language}.`
            }
        ];

        const response = await this.aiProvider.generateResponse(messages, cancellationToken);
        return this.extractCodeFromResponse(response.content);
    }

    public async explainCode(
        code: string,
        editor: vscode.TextEditor,
        cancellationToken?: vscode.CancellationToken
    ): Promise<string> {
        const language = this.getLanguageFromEditor(editor);
        
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: 'You are an expert code reviewer. Explain code clearly and concisely, focusing on what it does, how it works, and any important details.'
            },
            {
                role: 'user',
                content: `Please explain this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Provide a clear explanation of:
1. What this code does
2. How it works
3. Any important patterns or techniques used
4. Potential improvements or considerations`
            }
        ];

        const response = await this.aiProvider.generateResponse(messages, cancellationToken);
        return response.content;
    }

    public async fixCode(
        code: string,
        editor: vscode.TextEditor,
        cancellationToken?: vscode.CancellationToken
    ): Promise<string> {
        const language = this.getLanguageFromEditor(editor);
        
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are an expert ${language} developer. Fix bugs, syntax errors, and improve code quality. Return only the corrected code without explanations.`
            },
            {
                role: 'user',
                content: `Please fix any issues in this ${language} code and improve it:

\`\`\`${language}
${code}
\`\`\`

Fix:
- Syntax errors
- Logic bugs
- Performance issues
- Code style issues
- Add error handling if needed

Return only the corrected code.`
            }
        ];

        const response = await this.aiProvider.generateResponse(messages, cancellationToken);
        return this.extractCodeFromResponse(response.content);
    }

    public async generateTests(
        code: string,
        editor: vscode.TextEditor,
        cancellationToken?: vscode.CancellationToken
    ): Promise<string> {
        const language = this.getLanguageFromEditor(editor);
        const testFramework = this.getTestFramework(language);
        
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are an expert ${language} developer. Generate comprehensive unit tests using ${testFramework}. Include edge cases and error scenarios.`
            },
            {
                role: 'user',
                content: `Generate unit tests for this ${language} code using ${testFramework}:

\`\`\`${language}
${code}
\`\`\`

Include:
- Test cases for normal functionality
- Edge cases
- Error scenarios
- Mock dependencies if needed
- Clear test descriptions

Return only the test code.`
            }
        ];

        const response = await this.aiProvider.generateResponse(messages, cancellationToken);
        return this.extractCodeFromResponse(response.content);
    }

    public async refactorCode(
        code: string,
        editor: vscode.TextEditor,
        cancellationToken?: vscode.CancellationToken
    ): Promise<string> {
        const language = this.getLanguageFromEditor(editor);
        
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are an expert ${language} developer. Refactor code to improve readability, maintainability, and performance while preserving functionality.`
            },
            {
                role: 'user',
                content: `Please refactor this ${language} code to improve it:

\`\`\`${language}
${code}
\`\`\`

Focus on:
- Code readability and clarity
- Performance optimization
- Better variable/function names
- Removing code duplication
- Following best practices
- Maintaining the same functionality

Return only the refactored code.`
            }
        ];

        const response = await this.aiProvider.generateResponse(messages, cancellationToken);
        return this.extractCodeFromResponse(response.content);
    }

    public async addComments(
        code: string,
        editor: vscode.TextEditor,
        cancellationToken?: vscode.CancellationToken
    ): Promise<string> {
        const language = this.getLanguageFromEditor(editor);
        
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are an expert ${language} developer. Add clear, concise documentation comments to code without changing the functionality.`
            },
            {
                role: 'user',
                content: `Add appropriate documentation comments to this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Add:
- Function/method documentation
- Complex logic explanations
- Parameter descriptions
- Return value descriptions
- Important notes or warnings

Use the standard documentation format for ${language}. Return the code with comments added.`
            }
        ];

        const response = await this.aiProvider.generateResponse(messages, cancellationToken);
        return this.extractCodeFromResponse(response.content);
    }

    private getEditorContext(editor: vscode.TextEditor): string {
        const document = editor.document;
        const totalLines = document.lineCount;
        const startLine = Math.max(0, totalLines - 20);
        
        let context = '';
        for (let i = startLine; i < totalLines; i++) {
            context += document.lineAt(i).text + '\n';
        }
        
        return context.trim();
    }

    private getLanguageFromEditor(editor: vscode.TextEditor): string {
        const languageId = editor.document.languageId;
        
        // Map VS Code language IDs to more readable names
        const languageMap: { [key: string]: string } = {
            'typescript': 'TypeScript',
            'javascript': 'JavaScript',
            'python': 'Python',
            'java': 'Java',
            'csharp': 'C#',
            'cpp': 'C++',
            'c': 'C',
            'go': 'Go',
            'rust': 'Rust',
            'php': 'PHP',
            'ruby': 'Ruby',
            'swift': 'Swift',
            'kotlin': 'Kotlin',
            'scala': 'Scala',
            'html': 'HTML',
            'css': 'CSS',
            'scss': 'SCSS',
            'less': 'LESS',
            'json': 'JSON',
            'yaml': 'YAML',
            'xml': 'XML',
            'sql': 'SQL',
            'shell': 'Shell',
            'powershell': 'PowerShell',
            'dockerfile': 'Dockerfile',
            'markdown': 'Markdown'
        };

        return languageMap[languageId] || languageId;
    }

    private getTestFramework(language: string): string {
        const frameworkMap: { [key: string]: string } = {
            'TypeScript': 'Jest',
            'JavaScript': 'Jest',
            'Python': 'pytest',
            'Java': 'JUnit',
            'C#': 'NUnit',
            'C++': 'Google Test',
            'Go': 'Go testing package',
            'Rust': 'Rust built-in test framework',
            'PHP': 'PHPUnit',
            'Ruby': 'RSpec',
            'Swift': 'XCTest',
            'Kotlin': 'JUnit'
        };

        return frameworkMap[language] || 'appropriate testing framework';
    }

    private extractCodeFromResponse(response: string): string {
        // Remove markdown code blocks if present
        const codeBlockRegex = /```[\w]*\n?([\s\S]*?)\n?```/g;
        const match = codeBlockRegex.exec(response);
        
        if (match && match[1]) {
            return match[1].trim();
        }
        
        // If no code blocks found, return the response as-is (might be plain code)
        return response.trim();
    }
}