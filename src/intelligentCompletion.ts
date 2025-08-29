import * as vscode from 'vscode';
import { AIProvider, AIMessage } from './aiProvider';

export interface CompletionSuggestion {
    text: string;
    type: 'function' | 'class' | 'variable' | 'import' | 'comment' | 'block';
    confidence: number;
    description: string;
    insertText: string;
    documentation?: string;
}

export interface ContextualSuggestion {
    type: 'refactor' | 'optimize' | 'fix' | 'test' | 'document';
    title: string;
    description: string;
    action: string;
    code?: string;
    priority: 'high' | 'medium' | 'low';
}

export class IntelligentCompletion {
    private completionProvider: vscode.Disposable | undefined;
    private hoverProvider: vscode.Disposable | undefined;
    private codeActionProvider: vscode.Disposable | undefined;

    constructor(private aiProvider: AIProvider) {
        this.registerProviders();
    }

    private registerProviders() {
        // Register completion provider
        this.completionProvider = vscode.languages.registerCompletionItemProvider(
            { scheme: 'file' },
            {
                provideCompletionItems: async (document, position, token, context) => {
                    return this.provideCompletions(document, position, token, context);
                }
            },
            '.', ' ', '(', '{', '\n'
        );

        // Register hover provider
        this.hoverProvider = vscode.languages.registerHoverProvider(
            { scheme: 'file' },
            {
                provideHover: async (document, position, token) => {
                    return this.provideHover(document, position, token);
                }
            }
        );

        // Register code action provider
        this.codeActionProvider = vscode.languages.registerCodeActionsProvider(
            { scheme: 'file' },
            {
                provideCodeActions: async (document, range, context, token) => {
                    return this.provideCodeActions(document, range, context, token);
                }
            }
        );
    }

    private async provideCompletions(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[]> {
        try {
            const lineText = document.lineAt(position).text;
            const textBeforeCursor = lineText.substring(0, position.character);
            const textAfterCursor = lineText.substring(position.character);
            
            // Get surrounding context
            const contextLines = this.getContextLines(document, position, 10);
            const language = document.languageId;
            
            // Skip if we're in a comment or string (basic check)
            if (this.isInCommentOrString(textBeforeCursor)) {
                return [];
            }

            const suggestions = await this.getAICompletions(
                language,
                contextLines,
                textBeforeCursor,
                textAfterCursor,
                token
            );

            return suggestions.map(suggestion => {
                const item = new vscode.CompletionItem(suggestion.text, this.getCompletionKind(suggestion.type));
                item.insertText = suggestion.insertText;
                item.detail = suggestion.description;
                item.documentation = new vscode.MarkdownString(suggestion.documentation || suggestion.description);
                item.sortText = `${10 - suggestion.confidence}${suggestion.text}`;
                return item;
            });
        } catch (error) {
            console.error('Error providing completions:', error);
            return [];
        }
    }

    private async provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Hover | undefined> {
        try {
            const range = document.getWordRangeAtPosition(position);
            if (!range) return undefined;

            const word = document.getText(range);
            const line = document.lineAt(position).text;
            const contextLines = this.getContextLines(document, position, 5);
            const language = document.languageId;

            const explanation = await this.getCodeExplanation(
                word,
                line,
                contextLines,
                language,
                token
            );

            if (explanation) {
                return new vscode.Hover(
                    new vscode.MarkdownString(explanation),
                    range
                );
            }
        } catch (error) {
            console.error('Error providing hover:', error);
        }

        return undefined;
    }

    private async provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.CodeAction[]> {
        try {
            const selectedText = document.getText(range);
            if (!selectedText.trim()) return [];

            const language = document.languageId;
            const contextLines = this.getContextLines(document, range.start, 5);

            const suggestions = await this.getContextualSuggestions(
                selectedText,
                contextLines,
                language,
                token
            );

            return suggestions.map(suggestion => {
                const action = new vscode.CodeAction(
                    suggestion.title,
                    this.getCodeActionKind(suggestion.type)
                );
                
                action.edit = new vscode.WorkspaceEdit();
                if (suggestion.code) {
                    action.edit.replace(document.uri, range, suggestion.code);
                }
                
                action.isPreferred = suggestion.priority === 'high';
                return action;
            });
        } catch (error) {
            console.error('Error providing code actions:', error);
            return [];
        }
    }

    private async getAICompletions(
        language: string,
        context: string,
        textBefore: string,
        textAfter: string,
        token?: vscode.CancellationToken
    ): Promise<CompletionSuggestion[]> {
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are an intelligent code completion assistant for ${language}. Provide relevant code completions based on the context.

Return a JSON array of completions with this structure:
[
  {
    "text": "completion text",
    "type": "function|class|variable|import|comment|block",
    "confidence": 1-10,
    "description": "brief description",
    "insertText": "text to insert",
    "documentation": "detailed documentation (optional)"
  }
]

Provide 3-5 most relevant completions. Consider:
- Current context and patterns
- Language best practices
- Common patterns and idioms
- Variable/function naming conventions`
            },
            {
                role: 'user',
                content: `Language: ${language}

Context:
\`\`\`${language}
${context}
\`\`\`

Current line before cursor: "${textBefore}"
Current line after cursor: "${textAfter}"

Provide intelligent code completions for this position.`
            }
        ];

        try {
            const response = await this.aiProvider.generateResponse(messages, token);
            return this.parseCompletions(response.content);
        } catch (error) {
            console.error('Error getting AI completions:', error);
            return [];
        }
    }

    private async getCodeExplanation(
        word: string,
        line: string,
        context: string,
        language: string,
        token?: vscode.CancellationToken
    ): Promise<string | undefined> {
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are a code documentation assistant. Provide clear, concise explanations of code elements.

Explain what the highlighted word/symbol does in the given context. Include:
- What it is (function, variable, class, etc.)
- What it does
- Parameters/return values if applicable
- Usage examples if helpful

Keep explanations concise but informative.`
            },
            {
                role: 'user',
                content: `Language: ${language}
Word/Symbol: "${word}"
Line: "${line}"

Context:
\`\`\`${language}
${context}
\`\`\`

Explain what "${word}" does in this context.`
            }
        ];

        try {
            const response = await this.aiProvider.generateResponse(messages, token);
            return response.content;
        } catch (error) {
            console.error('Error getting code explanation:', error);
            return undefined;
        }
    }

    private async getContextualSuggestions(
        selectedCode: string,
        context: string,
        language: string,
        token?: vscode.CancellationToken
    ): Promise<ContextualSuggestion[]> {
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are a code improvement assistant. Analyze the selected code and provide contextual suggestions.

Return a JSON array with this structure:
[
  {
    "type": "refactor|optimize|fix|test|document",
    "title": "Action title",
    "description": "What this action does",
    "action": "Detailed action description",
    "code": "Improved code (if applicable)",
    "priority": "high|medium|low"
  }
]

Provide 2-4 most relevant suggestions focusing on:
- Code quality improvements
- Performance optimizations
- Bug fixes
- Better practices
- Documentation needs`
            },
            {
                role: 'user',
                content: `Language: ${language}

Selected code:
\`\`\`${language}
${selectedCode}
\`\`\`

Context:
\`\`\`${language}
${context}
\`\`\`

Provide contextual improvement suggestions for the selected code.`
            }
        ];

        try {
            const response = await this.aiProvider.generateResponse(messages, token);
            return this.parseContextualSuggestions(response.content);
        } catch (error) {
            console.error('Error getting contextual suggestions:', error);
            return [];
        }
    }

    private getContextLines(document: vscode.TextDocument, position: vscode.Position, lineCount: number): string {
        const startLine = Math.max(0, position.line - lineCount);
        const endLine = Math.min(document.lineCount - 1, position.line + lineCount);
        
        let context = '';
        for (let i = startLine; i <= endLine; i++) {
            const line = document.lineAt(i).text;
            context += line + '\n';
        }
        
        return context.trim();
    }

    private isInCommentOrString(text: string): boolean {
        // Basic check for comments and strings
        const trimmed = text.trim();
        return trimmed.startsWith('//') || 
               trimmed.startsWith('/*') || 
               trimmed.startsWith('#') ||
               (trimmed.includes('"') && !trimmed.endsWith('"')) ||
               (trimmed.includes("'") && !trimmed.endsWith("'"));
    }

    private getCompletionKind(type: string): vscode.CompletionItemKind {
        switch (type) {
            case 'function': return vscode.CompletionItemKind.Function;
            case 'class': return vscode.CompletionItemKind.Class;
            case 'variable': return vscode.CompletionItemKind.Variable;
            case 'import': return vscode.CompletionItemKind.Module;
            case 'comment': return vscode.CompletionItemKind.Text;
            case 'block': return vscode.CompletionItemKind.Snippet;
            default: return vscode.CompletionItemKind.Text;
        }
    }

    private getCodeActionKind(type: string): vscode.CodeActionKind {
        switch (type) {
            case 'refactor': return vscode.CodeActionKind.Refactor;
            case 'optimize': return vscode.CodeActionKind.RefactorRewrite;
            case 'fix': return vscode.CodeActionKind.QuickFix;
            case 'test': return vscode.CodeActionKind.Source;
            case 'document': return vscode.CodeActionKind.Source;
            default: return vscode.CodeActionKind.QuickFix;
        }
    }

    private parseCompletions(response: string): CompletionSuggestion[] {
        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                return [];
            }
            
            const completions = JSON.parse(jsonMatch[0]);
            return completions.filter((c: any) => c.text && c.insertText);
        } catch (error) {
            console.error('Error parsing completions:', error);
            return [];
        }
    }

    private parseContextualSuggestions(response: string): ContextualSuggestion[] {
        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                return [];
            }
            
            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error('Error parsing contextual suggestions:', error);
            return [];
        }
    }

    public dispose() {
        this.completionProvider?.dispose();
        this.hoverProvider?.dispose();
        this.codeActionProvider?.dispose();
    }
}