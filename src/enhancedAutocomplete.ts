import * as vscode from 'vscode';
import { AIProvider, AIMessage } from './aiProvider';

export interface AutocompleteContext {
    currentLine: string;
    previousLines: string[];
    nextLines: string[];
    fileName: string;
    language: string;
    projectContext: any;
    imports: string[];
    functions: string[];
    variables: string[];
}

export interface SmartSuggestion {
    text: string;
    insertText: string;
    kind: vscode.CompletionItemKind;
    detail: string;
    documentation: string;
    confidence: number;
    priority: number;
    snippet?: boolean;
}

export class EnhancedAutocomplete {
    private completionProvider: vscode.Disposable | undefined;
    private hoverProvider: vscode.Disposable | undefined;
    private signatureProvider: vscode.Disposable | undefined;
    private definitionProvider: vscode.Disposable | undefined;
    private cache: Map<string, SmartSuggestion[]> = new Map();
    private contextCache: Map<string, AutocompleteContext> = new Map();

    constructor(private aiProvider: AIProvider) {
        this.registerProviders();
        this.startContextAnalysis();
    }

    private registerProviders() {
        // Enhanced completion provider with real-time suggestions
        this.completionProvider = vscode.languages.registerCompletionItemProvider(
            { scheme: 'file' },
            {
                provideCompletionItems: async (document, position, token, context) => {
                    return this.provideEnhancedCompletions(document, position, token, context);
                },
                resolveCompletionItem: async (item, token) => {
                    return this.resolveCompletionItem(item, token);
                }
            },
            '.', ' ', '(', '{', '\n', ':', '=', '<', '>', '"', "'", '/', '*'
        );

        // Enhanced hover provider with AI explanations
        this.hoverProvider = vscode.languages.registerHoverProvider(
            { scheme: 'file' },
            {
                provideHover: async (document, position, token) => {
                    return this.provideEnhancedHover(document, position, token);
                }
            }
        );

        // Signature help provider
        this.signatureProvider = vscode.languages.registerSignatureHelpProvider(
            { scheme: 'file' },
            {
                provideSignatureHelp: async (document, position, token, context) => {
                    return this.provideSignatureHelp(document, position, token, context);
                }
            },
            '(', ','
        );

        // Definition provider
        this.definitionProvider = vscode.languages.registerDefinitionProvider(
            { scheme: 'file' },
            {
                provideDefinition: async (document, position, token) => {
                    return this.provideDefinition(document, position, token);
                }
            }
        );
    }

    private async provideEnhancedCompletions(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[]> {
        try {
            const autocompleteContext = await this.buildAutocompleteContext(document, position);
            const cacheKey = this.generateCacheKey(autocompleteContext);

            // Check cache first
            if (this.cache.has(cacheKey)) {
                const cachedSuggestions = this.cache.get(cacheKey)!;
                return this.convertToCompletionItems(cachedSuggestions);
            }

            // Get AI-powered suggestions
            const suggestions = await this.getAISuggestions(autocompleteContext, token);
            
            // Cache the results
            this.cache.set(cacheKey, suggestions);
            
            // Clean cache if it gets too large
            if (this.cache.size > 100) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }

            return this.convertToCompletionItems(suggestions);

        } catch (error) {
            console.error('Error providing enhanced completions:', error);
            return [];
        }
    }

    private async provideEnhancedHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Hover | undefined> {
        try {
            const range = document.getWordRangeAtPosition(position);
            if (!range) return undefined;

            const word = document.getText(range);
            const context = await this.buildAutocompleteContext(document, position);

            const explanation = await this.getAIExplanation(word, context, token);
            
            if (explanation) {
                const markdown = new vscode.MarkdownString();
                markdown.isTrusted = true;
                markdown.supportHtml = true;
                markdown.appendMarkdown(explanation);
                
                return new vscode.Hover(markdown, range);
            }

        } catch (error) {
            console.error('Error providing enhanced hover:', error);
        }

        return undefined;
    }

    private async provideSignatureHelp(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.SignatureHelpContext
    ): Promise<vscode.SignatureHelp | undefined> {
        try {
            const line = document.lineAt(position).text;
            const beforeCursor = line.substring(0, position.character);
            
            // Find function call
            const functionMatch = beforeCursor.match(/(\w+)\s*\(/);
            if (!functionMatch) return undefined;

            const functionName = functionMatch[1];
            const autocompleteContext = await this.buildAutocompleteContext(document, position);

            const signatureInfo = await this.getAISignatureHelp(functionName, autocompleteContext, token);
            
            if (signatureInfo) {
                const signatureHelp = new vscode.SignatureHelp();
                signatureHelp.signatures = signatureInfo.signatures;
                signatureHelp.activeSignature = 0;
                signatureHelp.activeParameter = this.getActiveParameter(beforeCursor);
                return signatureHelp;
            }

        } catch (error) {
            console.error('Error providing signature help:', error);
        }

        return undefined;
    }

    private async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Definition | undefined> {
        try {
            const range = document.getWordRangeAtPosition(position);
            if (!range) return undefined;

            const word = document.getText(range);
            const context = await this.buildAutocompleteContext(document, position);

            const definition = await this.findAIDefinition(word, context, token);
            
            if (definition) {
                return new vscode.Location(
                    vscode.Uri.file(definition.file),
                    new vscode.Position(definition.line, definition.character)
                );
            }

        } catch (error) {
            console.error('Error providing definition:', error);
        }

        return undefined;
    }

    private async buildAutocompleteContext(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<AutocompleteContext> {
        const fileName = document.fileName;
        const cacheKey = `${fileName}:${position.line}:${position.character}`;
        
        if (this.contextCache.has(cacheKey)) {
            return this.contextCache.get(cacheKey)!;
        }

        const currentLine = document.lineAt(position).text;
        const previousLines = [];
        const nextLines = [];

        // Get surrounding context
        for (let i = Math.max(0, position.line - 10); i < position.line; i++) {
            previousLines.push(document.lineAt(i).text);
        }

        for (let i = position.line + 1; i < Math.min(document.lineCount, position.line + 10); i++) {
            nextLines.push(document.lineAt(i).text);
        }

        // Analyze document for imports, functions, variables
        const fullText = document.getText();
        const imports = this.extractImports(fullText, document.languageId);
        const functions = this.extractFunctions(fullText, document.languageId);
        const variables = this.extractVariables(fullText, document.languageId);

        // Get project context
        const projectContext = await this.getProjectContext(document.uri.fsPath);

        const context: AutocompleteContext = {
            currentLine,
            previousLines,
            nextLines,
            fileName,
            language: document.languageId,
            projectContext,
            imports,
            functions,
            variables
        };

        this.contextCache.set(cacheKey, context);
        return context;
    }

    private async getAISuggestions(
        context: AutocompleteContext,
        token?: vscode.CancellationToken
    ): Promise<SmartSuggestion[]> {
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are an expert code completion assistant. Provide intelligent code suggestions based on the context.

Return a JSON array of suggestions with this structure:
[
  {
    "text": "suggestion text",
    "insertText": "text to insert (can include placeholders like $1, $2)",
    "kind": "function|variable|class|method|property|keyword|snippet",
    "detail": "brief description",
    "documentation": "detailed explanation",
    "confidence": 1-10,
    "priority": 1-10,
    "snippet": true/false
  }
]

Rules:
1. Provide 5-10 most relevant suggestions
2. Consider current context, imports, and project structure
3. Include both simple completions and intelligent snippets
4. Use VS Code snippet syntax for placeholders ($1, $2, etc.)
5. Prioritize based on relevance and likelihood of use
6. Include proper documentation for each suggestion`
            },
            {
                role: 'user',
                content: `Provide code completions for this context:

Language: ${context.language}
Current line: "${context.currentLine}"
Previous lines:
${context.previousLines.slice(-5).join('\n')}

Available imports: ${context.imports.join(', ')}
Available functions: ${context.functions.join(', ')}
Available variables: ${context.variables.join(', ')}

Project context: ${JSON.stringify(context.projectContext, null, 2)}

Provide intelligent, contextual code completions.`
            }
        ];

        try {
            const response = await this.aiProvider.generateResponse(messages, token);
            return this.parseAISuggestions(response.content);
        } catch (error) {
            console.error('Error getting AI suggestions:', error);
            return this.getFallbackSuggestions(context);
        }
    }

    private async getAIExplanation(
        word: string,
        context: AutocompleteContext,
        token?: vscode.CancellationToken
    ): Promise<string | undefined> {
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: 'You are a code documentation expert. Provide clear, helpful explanations of code elements with examples and usage information.'
            },
            {
                role: 'user',
                content: `Explain this code element: "${word}"

Context:
Language: ${context.language}
Current line: "${context.currentLine}"
Available functions: ${context.functions.join(', ')}
Available variables: ${context.variables.join(', ')}

Provide a helpful explanation with:
1. What it is (function, variable, class, etc.)
2. What it does
3. Parameters/return values if applicable
4. Usage example if helpful
5. Any important notes or warnings

Format as markdown.`
            }
        ];

        try {
            const response = await this.aiProvider.generateResponse(messages, token);
            return response.content;
        } catch (error) {
            console.error('Error getting AI explanation:', error);
            return undefined;
        }
    }

    private async getAISignatureHelp(
        functionName: string,
        context: AutocompleteContext,
        token?: vscode.CancellationToken
    ): Promise<{ signatures: vscode.SignatureInformation[] } | undefined> {
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `Provide function signature help. Return JSON with this structure:
{
  "signatures": [
    {
      "label": "function signature",
      "documentation": "function description",
      "parameters": [
        {
          "label": "parameter name",
          "documentation": "parameter description"
        }
      ]
    }
  ]
}`
            },
            {
                role: 'user',
                content: `Provide signature help for function: ${functionName}

Context:
Language: ${context.language}
Available functions: ${context.functions.join(', ')}
Project context: ${JSON.stringify(context.projectContext)}`
            }
        ];

        try {
            const response = await this.aiProvider.generateResponse(messages, token);
            const data = JSON.parse(response.content);
            
            const signatures = data.signatures.map((sig: any) => {
                const signature = new vscode.SignatureInformation(sig.label, sig.documentation);
                signature.parameters = sig.parameters.map((param: any) => 
                    new vscode.ParameterInformation(param.label, param.documentation)
                );
                return signature;
            });

            return { signatures };
        } catch (error) {
            console.error('Error getting signature help:', error);
            return undefined;
        }
    }

    private async findAIDefinition(
        word: string,
        context: AutocompleteContext,
        token?: vscode.CancellationToken
    ): Promise<{ file: string; line: number; character: number } | undefined> {
        // This would integrate with project analysis to find definitions
        // For now, return undefined to use VS Code's built-in definition provider
        return undefined;
    }

    private convertToCompletionItems(suggestions: SmartSuggestion[]): vscode.CompletionItem[] {
        return suggestions.map(suggestion => {
            const item = new vscode.CompletionItem(suggestion.text, suggestion.kind);
            
            if (suggestion.snippet) {
                item.insertText = new vscode.SnippetString(suggestion.insertText);
            } else {
                item.insertText = suggestion.insertText;
            }
            
            item.detail = suggestion.detail;
            item.documentation = new vscode.MarkdownString(suggestion.documentation);
            item.sortText = `${10 - suggestion.priority}${suggestion.text}`;
            item.filterText = suggestion.text;
            
            return item;
        });
    }

    private parseAISuggestions(response: string): SmartSuggestion[] {
        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (!jsonMatch) return [];
            
            const suggestions = JSON.parse(jsonMatch[0]);
            return suggestions.map((s: any) => ({
                text: s.text,
                insertText: s.insertText,
                kind: this.getCompletionKind(s.kind),
                detail: s.detail,
                documentation: s.documentation,
                confidence: s.confidence || 5,
                priority: s.priority || 5,
                snippet: s.snippet || false
            }));
        } catch (error) {
            console.error('Error parsing AI suggestions:', error);
            return [];
        }
    }

    private getCompletionKind(kind: string): vscode.CompletionItemKind {
        const kindMap: { [key: string]: vscode.CompletionItemKind } = {
            'function': vscode.CompletionItemKind.Function,
            'variable': vscode.CompletionItemKind.Variable,
            'class': vscode.CompletionItemKind.Class,
            'method': vscode.CompletionItemKind.Method,
            'property': vscode.CompletionItemKind.Property,
            'keyword': vscode.CompletionItemKind.Keyword,
            'snippet': vscode.CompletionItemKind.Snippet,
            'module': vscode.CompletionItemKind.Module,
            'interface': vscode.CompletionItemKind.Interface,
            'enum': vscode.CompletionItemKind.Enum
        };
        
        return kindMap[kind] || vscode.CompletionItemKind.Text;
    }

    private getFallbackSuggestions(context: AutocompleteContext): SmartSuggestion[] {
        const suggestions: SmartSuggestion[] = [];
        
        // Add available functions
        context.functions.forEach(func => {
            suggestions.push({
                text: func,
                insertText: `${func}($1)`,
                kind: vscode.CompletionItemKind.Function,
                detail: 'Available function',
                documentation: `Function: ${func}`,
                confidence: 7,
                priority: 7,
                snippet: true
            });
        });

        // Add available variables
        context.variables.forEach(variable => {
            suggestions.push({
                text: variable,
                insertText: variable,
                kind: vscode.CompletionItemKind.Variable,
                detail: 'Available variable',
                documentation: `Variable: ${variable}`,
                confidence: 6,
                priority: 6
            });
        });

        return suggestions;
    }

    private extractImports(text: string, language: string): string[] {
        const imports: string[] = [];
        
        switch (language) {
            case 'typescript':
            case 'javascript':
                const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
                let match;
                while ((match = importRegex.exec(text)) !== null) {
                    imports.push(match[1]);
                }
                break;
            case 'python':
                const pythonImportRegex = /(?:from\s+(\S+)\s+)?import\s+([^\n]+)/g;
                while ((match = pythonImportRegex.exec(text)) !== null) {
                    imports.push(match[1] || match[2]);
                }
                break;
        }
        
        return imports;
    }

    private extractFunctions(text: string, language: string): string[] {
        const functions: string[] = [];
        
        switch (language) {
            case 'typescript':
            case 'javascript':
                const funcRegex = /(?:function\s+(\w+)|(\w+)\s*(?:=\s*)?(?:async\s+)?(?:function|\([^)]*\)\s*=>))/g;
                let match;
                while ((match = funcRegex.exec(text)) !== null) {
                    functions.push(match[1] || match[2]);
                }
                break;
            case 'python':
                const pythonFuncRegex = /def\s+(\w+)/g;
                while ((match = pythonFuncRegex.exec(text)) !== null) {
                    functions.push(match[1]);
                }
                break;
        }
        
        return functions;
    }

    private extractVariables(text: string, language: string): string[] {
        const variables: string[] = [];
        
        switch (language) {
            case 'typescript':
            case 'javascript':
                const varRegex = /(?:const|let|var)\s+(\w+)/g;
                let match;
                while ((match = varRegex.exec(text)) !== null) {
                    variables.push(match[1]);
                }
                break;
            case 'python':
                const pythonVarRegex = /^(\w+)\s*=/gm;
                while ((match = pythonVarRegex.exec(text)) !== null) {
                    variables.push(match[1]);
                }
                break;
        }
        
        return variables;
    }

    private async getProjectContext(filePath: string): Promise<any> {
        // This would analyze the project structure
        // For now, return basic info
        return {
            framework: 'unknown',
            dependencies: [],
            structure: []
        };
    }

    private generateCacheKey(context: AutocompleteContext): string {
        return `${context.fileName}:${context.currentLine}:${context.language}`;
    }

    private getActiveParameter(beforeCursor: string): number {
        const commas = (beforeCursor.match(/,/g) || []).length;
        return commas;
    }

    private async resolveCompletionItem(
        item: vscode.CompletionItem,
        token: vscode.CancellationToken
    ): Promise<vscode.CompletionItem> {
        // Add additional details if needed
        return item;
    }

    private startContextAnalysis() {
        // Start background analysis of the workspace
        setInterval(() => {
            this.analyzeWorkspaceContext();
        }, 30000); // Every 30 seconds
    }

    private async analyzeWorkspaceContext() {
        // Background analysis of workspace for better suggestions
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) return;

            // Analyze project structure, dependencies, etc.
            // This would feed into better autocomplete suggestions
        } catch (error) {
            console.error('Error analyzing workspace context:', error);
        }
    }

    public dispose() {
        this.completionProvider?.dispose();
        this.hoverProvider?.dispose();
        this.signatureProvider?.dispose();
        this.definitionProvider?.dispose();
        this.cache.clear();
        this.contextCache.clear();
    }
}