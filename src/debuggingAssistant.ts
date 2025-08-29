import * as vscode from 'vscode';
import { AIProvider, AIMessage } from './aiProvider';

export interface DebugSuggestion {
    id: string;
    type: 'breakpoint' | 'watch' | 'step' | 'inspect' | 'fix';
    title: string;
    description: string;
    code?: string;
    file?: string;
    line?: number;
    action?: () => Promise<void>;
    confidence: number;
}

export interface ErrorAnalysis {
    errorType: string;
    possibleCauses: string[];
    suggestedFixes: string[];
    relatedCode: string[];
    debuggingSteps: string[];
    preventionTips: string[];
}

export interface PerformanceInsight {
    type: 'memory' | 'cpu' | 'network' | 'rendering';
    issue: string;
    impact: 'low' | 'medium' | 'high';
    suggestion: string;
    code?: string;
    file?: string;
    line?: number;
}

export class DebuggingAssistant {
    private debugSession: vscode.DebugSession | undefined;
    private breakpoints: Map<string, vscode.Breakpoint[]> = new Map();
    private watchExpressions: string[] = [];
    private errorHistory: any[] = [];

    constructor(private aiProvider: AIProvider) {
        this.registerDebugListeners();
    }

    private registerDebugListeners() {
        // Listen for debug session events
        vscode.debug.onDidStartDebugSession(session => {
            this.debugSession = session;
            this.onDebugSessionStart(session);
        });

        vscode.debug.onDidTerminateDebugSession(session => {
            this.onDebugSessionEnd(session);
            this.debugSession = undefined;
        });

        vscode.debug.onDidChangeBreakpoints(event => {
            this.onBreakpointsChanged(event);
        });

        // Listen for diagnostic changes (errors, warnings)
        vscode.languages.onDidChangeDiagnostics(event => {
            this.onDiagnosticsChanged(event);
        });
    }

    public async analyzeError(
        error: string,
        stackTrace?: string,
        context?: {
            file: string;
            line: number;
            code: string;
        },
        cancellationToken?: vscode.CancellationToken
    ): Promise<ErrorAnalysis> {
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are an expert debugging assistant. Analyze errors and provide comprehensive debugging guidance.

Return a JSON object with this structure:
{
  "errorType": "string",
  "possibleCauses": ["cause1", "cause2"],
  "suggestedFixes": ["fix1", "fix2"],
  "relatedCode": ["code snippet1", "code snippet2"],
  "debuggingSteps": ["step1", "step2"],
  "preventionTips": ["tip1", "tip2"]
}

Provide practical, actionable advice for debugging and fixing the error.`
            },
            {
                role: 'user',
                content: `Analyze this error:

Error: ${error}

${stackTrace ? `Stack Trace:\n${stackTrace}` : ''}

${context ? `Context:
File: ${context.file}
Line: ${context.line}
Code: ${context.code}` : ''}

Provide comprehensive debugging analysis and suggestions.`
            }
        ];

        try {
            const response = await this.aiProvider.generateResponse(messages, cancellationToken);
            const analysis = JSON.parse(response.content);
            
            // Store error in history for learning
            this.errorHistory.push({
                error,
                stackTrace,
                context,
                analysis,
                timestamp: new Date()
            });

            return analysis;
        } catch (error) {
            console.error('Error analyzing error:', error);
            return this.getFallbackErrorAnalysis();
        }
    }

    public async suggestBreakpoints(
        file: string,
        problemDescription: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<DebugSuggestion[]> {
        const document = await vscode.workspace.openTextDocument(file);
        const content = document.getText();

        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are a debugging expert. Suggest strategic breakpoint locations for debugging.

Return a JSON array of suggestions:
[
  {
    "id": "unique-id",
    "type": "breakpoint",
    "title": "Breakpoint title",
    "description": "Why this breakpoint is useful",
    "line": 42,
    "confidence": 8
  }
]

Focus on locations that would be most helpful for understanding the problem.`
            },
            {
                role: 'user',
                content: `Suggest breakpoints for debugging this problem:

Problem: ${problemDescription}

File: ${file}
Code:
${content}

Suggest 3-5 strategic breakpoint locations that would help debug this issue.`
            }
        ];

        try {
            const response = await this.aiProvider.generateResponse(messages, cancellationToken);
            const suggestions = JSON.parse(response.content);
            
            return suggestions.map((s: any) => ({
                ...s,
                file,
                action: async () => {
                    await this.setBreakpoint(file, s.line);
                }
            }));
        } catch (error) {
            console.error('Error suggesting breakpoints:', error);
            return [];
        }
    }

    public async suggestWatchExpressions(
        context: {
            file: string;
            line: number;
            variables: string[];
            functions: string[];
        },
        cancellationToken?: vscode.CancellationToken
    ): Promise<DebugSuggestion[]> {
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `Suggest useful watch expressions for debugging based on the context.

Return a JSON array:
[
  {
    "id": "unique-id",
    "type": "watch",
    "title": "Watch expression",
    "description": "Why this expression is useful to watch",
    "code": "expression to watch",
    "confidence": 8
  }
]`
            },
            {
                role: 'user',
                content: `Suggest watch expressions for debugging:

Context:
File: ${context.file}
Line: ${context.line}
Available variables: ${context.variables.join(', ')}
Available functions: ${context.functions.join(', ')}

Suggest 3-5 useful expressions to watch during debugging.`
            }
        ];

        try {
            const response = await this.aiProvider.generateResponse(messages, cancellationToken);
            const suggestions = JSON.parse(response.content);
            
            return suggestions.map((s: any) => ({
                ...s,
                action: async () => {
                    await this.addWatchExpression(s.code);
                }
            }));
        } catch (error) {
            console.error('Error suggesting watch expressions:', error);
            return [];
        }
    }

    public async analyzePerformance(
        file: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<PerformanceInsight[]> {
        const document = await vscode.workspace.openTextDocument(file);
        const content = document.getText();

        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `Analyze code for performance issues and provide insights.

Return a JSON array:
[
  {
    "type": "memory|cpu|network|rendering",
    "issue": "Description of the issue",
    "impact": "low|medium|high",
    "suggestion": "How to fix it",
    "code": "problematic code snippet",
    "line": 42
  }
]`
            },
            {
                role: 'user',
                content: `Analyze this code for performance issues:

File: ${file}
Code:
${content}

Identify potential performance bottlenecks and suggest optimizations.`
            }
        ];

        try {
            const response = await this.aiProvider.generateResponse(messages, cancellationToken);
            const insights = JSON.parse(response.content);
            
            return insights.map((insight: any) => ({
                ...insight,
                file
            }));
        } catch (error) {
            console.error('Error analyzing performance:', error);
            return [];
        }
    }

    public async generateDebugScript(
        problemDescription: string,
        language: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<string> {
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `Generate a debugging script to help diagnose the problem.

Create a ${language} script that:
1. Sets up debugging environment
2. Reproduces the issue
3. Collects relevant data
4. Provides debugging output

Return only the script code.`
            },
            {
                role: 'user',
                content: `Generate a debugging script for:

Problem: ${problemDescription}
Language: ${language}

Create a script that helps debug this specific issue.`
            }
        ];

        try {
            const response = await this.aiProvider.generateResponse(messages, cancellationToken);
            return this.extractCodeFromResponse(response.content);
        } catch (error) {
            console.error('Error generating debug script:', error);
            return `// Error generating debug script: ${error}`;
        }
    }

    public async smartStepThrough(
        currentFile: string,
        currentLine: number,
        cancellationToken?: vscode.CancellationToken
    ): Promise<DebugSuggestion[]> {
        const document = await vscode.workspace.openTextDocument(currentFile);
        const content = document.getText();
        const lines = content.split('\n');
        const currentLineContent = lines[currentLine - 1];

        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `Suggest smart debugging steps based on the current execution point.

Return a JSON array of suggestions:
[
  {
    "id": "unique-id",
    "type": "step|inspect|watch",
    "title": "Action title",
    "description": "Why this action is recommended",
    "confidence": 8
  }
]`
            },
            {
                role: 'user',
                content: `Currently debugging at:

File: ${currentFile}
Line: ${currentLine}
Code: ${currentLineContent}

Context (surrounding lines):
${lines.slice(Math.max(0, currentLine - 3), currentLine + 3).join('\n')}

Suggest the best next debugging steps.`
            }
        ];

        try {
            const response = await this.aiProvider.generateResponse(messages, cancellationToken);
            const suggestions = JSON.parse(response.content);
            
            return suggestions.map((s: any) => ({
                ...s,
                file: currentFile,
                line: currentLine,
                action: async () => {
                    await this.executeDebugAction(s.type, s);
                }
            }));
        } catch (error) {
            console.error('Error getting smart step suggestions:', error);
            return [];
        }
    }

    public async explainDebuggerState(
        variables: any,
        callStack: any,
        cancellationToken?: vscode.CancellationToken
    ): Promise<string> {
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: 'Explain the current debugger state in simple terms, highlighting important information and potential issues.'
            },
            {
                role: 'user',
                content: `Explain this debugger state:

Variables:
${JSON.stringify(variables, null, 2)}

Call Stack:
${JSON.stringify(callStack, null, 2)}

Provide a clear explanation of what's happening and what to look for.`
            }
        ];

        try {
            const response = await this.aiProvider.generateResponse(messages, cancellationToken);
            return response.content;
        } catch (error) {
            console.error('Error explaining debugger state:', error);
            return 'Unable to explain debugger state at this time.';
        }
    }

    private async setBreakpoint(file: string, line: number): Promise<void> {
        const uri = vscode.Uri.file(file);
        const location = new vscode.Location(uri, new vscode.Position(line - 1, 0));
        const breakpoint = new vscode.SourceBreakpoint(location);
        
        const existingBreakpoints = this.breakpoints.get(file) || [];
        existingBreakpoints.push(breakpoint);
        this.breakpoints.set(file, existingBreakpoints);
        
        vscode.debug.addBreakpoints([breakpoint]);
    }

    private async addWatchExpression(expression: string): Promise<void> {
        this.watchExpressions.push(expression);
        
        // Add to VS Code watch panel if possible
        if (this.debugSession) {
            // This would require VS Code API support for programmatic watch expressions
            vscode.window.showInformationMessage(`Added watch expression: ${expression}`);
        }
    }

    private async executeDebugAction(type: string, suggestion: any): Promise<void> {
        switch (type) {
            case 'step':
                await vscode.commands.executeCommand('workbench.action.debug.stepOver');
                break;
            case 'inspect':
                // Open variable inspector or show hover
                vscode.window.showInformationMessage(`Inspect: ${suggestion.description}`);
                break;
            case 'watch':
                await this.addWatchExpression(suggestion.code);
                break;
        }
    }

    private onDebugSessionStart(session: vscode.DebugSession): void {
        console.log(`Debug session started: ${session.name}`);
        
        // Initialize debugging assistance
        this.initializeDebuggingAssistance(session);
    }

    private onDebugSessionEnd(session: vscode.DebugSession): void {
        console.log(`Debug session ended: ${session.name}`);
        
        // Clean up
        this.breakpoints.clear();
        this.watchExpressions = [];
    }

    private onBreakpointsChanged(event: vscode.BreakpointsChangeEvent): void {
        // Update internal breakpoint tracking
        for (const added of event.added) {
            if (added instanceof vscode.SourceBreakpoint) {
                const file = added.location.uri.fsPath;
                const existing = this.breakpoints.get(file) || [];
                existing.push(added);
                this.breakpoints.set(file, existing);
            }
        }

        for (const removed of event.removed) {
            if (removed instanceof vscode.SourceBreakpoint) {
                const file = removed.location.uri.fsPath;
                const existing = this.breakpoints.get(file) || [];
                const filtered = existing.filter(bp => bp !== removed);
                this.breakpoints.set(file, filtered);
            }
        }
    }

    private onDiagnosticsChanged(event: vscode.DiagnosticChangeEvent): void {
        // Analyze new errors and provide debugging suggestions
        for (const uri of event.uris) {
            const diagnostics = vscode.languages.getDiagnostics(uri);
            
            for (const diagnostic of diagnostics) {
                if (diagnostic.severity === vscode.DiagnosticSeverity.Error) {
                    this.handleNewError(uri, diagnostic);
                }
            }
        }
    }

    private async handleNewError(uri: vscode.Uri, diagnostic: vscode.Diagnostic): Promise<void> {
        // Automatically analyze new errors and suggest debugging steps
        const document = await vscode.workspace.openTextDocument(uri);
        const line = document.lineAt(diagnostic.range.start.line);
        
        const analysis = await this.analyzeError(
            diagnostic.message,
            undefined,
            {
                file: uri.fsPath,
                line: diagnostic.range.start.line + 1,
                code: line.text
            }
        );

        // Show debugging suggestions
        this.showDebuggingSuggestions(analysis, uri, diagnostic);
    }

    private showDebuggingSuggestions(
        analysis: ErrorAnalysis,
        uri: vscode.Uri,
        diagnostic: vscode.Diagnostic
    ): void {
        const message = `Debugging suggestion for "${analysis.errorType}": ${analysis.suggestedFixes[0] || 'Check the error details'}`;
        
        vscode.window.showInformationMessage(
            message,
            'Show Details',
            'Add Breakpoint',
            'Ignore'
        ).then(selection => {
            switch (selection) {
                case 'Show Details':
                    this.showErrorAnalysisPanel(analysis);
                    break;
                case 'Add Breakpoint':
                    this.setBreakpoint(uri.fsPath, diagnostic.range.start.line + 1);
                    break;
            }
        });
    }

    private showErrorAnalysisPanel(analysis: ErrorAnalysis): void {
        const panel = vscode.window.createWebviewPanel(
            'errorAnalysis',
            'Error Analysis',
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );

        panel.webview.html = this.getErrorAnalysisHtml(analysis);
    }

    private getErrorAnalysisHtml(analysis: ErrorAnalysis): string {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 20px;
                    line-height: 1.6;
                }
                h1, h2 { color: var(--vscode-textLink-foreground); }
                .section {
                    margin: 20px 0;
                    padding: 15px;
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 5px;
                }
                ul { padding-left: 20px; }
                li { margin: 5px 0; }
                code {
                    background-color: var(--vscode-textBlockQuote-background);
                    padding: 2px 4px;
                    border-radius: 2px;
                }
            </style>
        </head>
        <body>
            <h1>Error Analysis: ${analysis.errorType}</h1>
            
            <div class="section">
                <h2>Possible Causes</h2>
                <ul>
                    ${analysis.possibleCauses.map(cause => `<li>${cause}</li>`).join('')}
                </ul>
            </div>
            
            <div class="section">
                <h2>Suggested Fixes</h2>
                <ul>
                    ${analysis.suggestedFixes.map(fix => `<li>${fix}</li>`).join('')}
                </ul>
            </div>
            
            <div class="section">
                <h2>Debugging Steps</h2>
                <ol>
                    ${analysis.debuggingSteps.map(step => `<li>${step}</li>`).join('')}
                </ol>
            </div>
            
            <div class="section">
                <h2>Prevention Tips</h2>
                <ul>
                    ${analysis.preventionTips.map(tip => `<li>${tip}</li>`).join('')}
                </ul>
            </div>
        </body>
        </html>
        `;
    }

    private async initializeDebuggingAssistance(session: vscode.DebugSession): Promise<void> {
        // Set up intelligent debugging assistance
        // This could include automatic watch expressions, smart breakpoints, etc.
    }

    private getFallbackErrorAnalysis(): ErrorAnalysis {
        return {
            errorType: 'Unknown Error',
            possibleCauses: ['Check syntax', 'Verify variable names', 'Check imports'],
            suggestedFixes: ['Review the error message', 'Check the documentation'],
            relatedCode: [],
            debuggingSteps: ['Set a breakpoint', 'Step through the code', 'Check variable values'],
            preventionTips: ['Use a linter', 'Write tests', 'Use TypeScript for type safety']
        };
    }

    private extractCodeFromResponse(response: string): string {
        const codeBlockRegex = /```[\w]*\n?([\s\S]*?)\n?```/g;
        const match = codeBlockRegex.exec(response);
        
        if (match && match[1]) {
            return match[1].trim();
        }
        
        return response.trim();
    }

    public getErrorHistory(): any[] {
        return this.errorHistory;
    }

    public getActiveBreakpoints(): Map<string, vscode.Breakpoint[]> {
        return this.breakpoints;
    }

    public getWatchExpressions(): string[] {
        return this.watchExpressions;
    }
}