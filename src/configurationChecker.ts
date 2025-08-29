import * as vscode from 'vscode';
import { AIProvider } from './aiProvider';

export interface ConfigurationStatus {
    isConfigured: boolean;
    provider: string;
    hasApiKey: boolean;
    canConnect: boolean;
    issues: string[];
    recommendations: string[];
}

export class ConfigurationChecker {
    constructor(private aiProvider: AIProvider) {}

    public async checkConfiguration(): Promise<ConfigurationStatus> {
        const config = vscode.workspace.getConfiguration('aiCodeGenerator');
        const provider = config.get<string>('provider', 'gemini');
        
        const status: ConfigurationStatus = {
            isConfigured: false,
            provider,
            hasApiKey: false,
            canConnect: false,
            issues: [],
            recommendations: []
        };

        // Check if API key is configured
        const apiKey = this.getApiKeyForProvider(provider, config);
        status.hasApiKey = !!apiKey;

        if (!apiKey) {
            status.issues.push(`No API key configured for ${provider}`);
            status.recommendations.push(`Configure your ${provider.toUpperCase()} API key in settings`);
        } else {
            // Test connection
            try {
                status.canConnect = await this.aiProvider.testConnection();
                if (!status.canConnect) {
                    status.issues.push('Cannot connect to AI provider');
                    status.recommendations.push('Check your API key and internet connection');
                }
            } catch (error) {
                status.issues.push(`Connection test failed: ${error}`);
                status.recommendations.push('Verify your API key is valid and has sufficient quota');
            }
        }

        status.isConfigured = status.hasApiKey && status.canConnect;

        // Add provider-specific recommendations
        this.addProviderSpecificRecommendations(provider, status);

        return status;
    }

    private getApiKeyForProvider(provider: string, config: vscode.WorkspaceConfiguration): string | undefined {
        switch (provider) {
            case 'openai':
                return config.get<string>('openai.apiKey');
            case 'gemini':
                return config.get<string>('gemini.apiKey');
            case 'anthropic':
                return config.get<string>('anthropic.apiKey');
            case 'qodo':
                return config.get<string>('qodo.apiKey');
            case 'ollama':
                return 'local'; // Ollama doesn't need API key
            default:
                return undefined;
        }
    }

    private addProviderSpecificRecommendations(provider: string, status: ConfigurationStatus) {
        switch (provider) {
            case 'gemini':
                if (!status.hasApiKey) {
                    status.recommendations.push('Get a free Gemini API key from https://makersuite.google.com/app/apikey');
                    status.recommendations.push('Gemini offers a generous free tier for development');
                }
                break;
            case 'openai':
                if (!status.hasApiKey) {
                    status.recommendations.push('Get an OpenAI API key from https://platform.openai.com/api-keys');
                    status.recommendations.push('Note: OpenAI requires payment for API usage');
                }
                break;
            case 'anthropic':
                if (!status.hasApiKey) {
                    status.recommendations.push('Get an Anthropic API key from https://console.anthropic.com/');
                    status.recommendations.push('Claude offers high-quality responses for complex tasks');
                }
                break;
            case 'ollama':
                status.recommendations.push('Ensure Ollama is running locally on http://localhost:11434');
                status.recommendations.push('Install Ollama from https://ollama.ai for local AI models');
                break;
        }
    }

    public async showConfigurationDialog(): Promise<void> {
        const status = await this.checkConfiguration();

        if (status.isConfigured) {
            vscode.window.showInformationMessage(
                `✅ AI Code Generator is configured and ready! Using ${status.provider.toUpperCase()}.`
            );
            return;
        }

        const message = status.issues.length > 0 
            ? `❌ Configuration Issues:\n${status.issues.join('\n')}`
            : '⚠️ AI Code Generator needs configuration';

        const choice = await vscode.window.showWarningMessage(
            message,
            'Open Settings',
            'Get API Key',
            'Switch Provider',
            'Help'
        );

        switch (choice) {
            case 'Open Settings':
                await vscode.commands.executeCommand('workbench.action.openSettings', 'aiCodeGenerator');
                break;
            case 'Get API Key':
                await this.openApiKeyUrl(status.provider);
                break;
            case 'Switch Provider':
                await this.showProviderSelection();
                break;
            case 'Help':
                await this.showHelpDialog(status);
                break;
        }
    }

    private async openApiKeyUrl(provider: string) {
        const urls: { [key: string]: string } = {
            'gemini': 'https://makersuite.google.com/app/apikey',
            'openai': 'https://platform.openai.com/api-keys',
            'anthropic': 'https://console.anthropic.com/',
            'qodo': 'https://qodo.ai',
            'ollama': 'https://ollama.ai'
        };

        const url = urls[provider];
        if (url) {
            await vscode.env.openExternal(vscode.Uri.parse(url));
        }
    }

    private async showProviderSelection() {
        const providers = [
            {
                label: '🤖 Google Gemini',
                description: 'Free tier available, fast responses',
                detail: 'gemini'
            },
            {
                label: '🧠 OpenAI GPT',
                description: 'High quality, requires payment',
                detail: 'openai'
            },
            {
                label: '🎭 Anthropic Claude',
                description: 'Excellent for complex reasoning',
                detail: 'anthropic'
            },
            {
                label: '🏠 Ollama (Local)',
                description: 'Run models locally, no API key needed',
                detail: 'ollama'
            },
            {
                label: '🔧 Qodo',
                description: 'Specialized for code analysis',
                detail: 'qodo'
            }
        ];

        const choice = await vscode.window.showQuickPick(providers, {
            placeHolder: 'Select AI Provider'
        });

        if (choice) {
            const config = vscode.workspace.getConfiguration('aiCodeGenerator');
            await config.update('provider', choice.detail, vscode.ConfigurationTarget.Global);
            
            vscode.window.showInformationMessage(
                `Switched to ${choice.label}. Please configure the API key in settings.`
            );
            
            // Open settings for the new provider
            await vscode.commands.executeCommand('workbench.action.openSettings', `aiCodeGenerator.${choice.detail}`);
        }
    }

    private async showHelpDialog(status: ConfigurationStatus) {
        const panel = vscode.window.createWebviewPanel(
            'aiConfigHelp',
            'AI Code Generator Setup Help',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        panel.webview.html = this.getHelpHtml(status);

        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'openSettings':
                    await vscode.commands.executeCommand('workbench.action.openSettings', 'aiCodeGenerator');
                    break;
                case 'openApiKey':
                    await this.openApiKeyUrl(message.provider);
                    break;
                case 'testConnection':
                    await this.testAndShowResult();
                    break;
            }
        });
    }

    private async testAndShowResult() {
        try {
            const canConnect = await this.aiProvider.testConnection();
            if (canConnect) {
                vscode.window.showInformationMessage('✅ Connection successful! AI Code Generator is ready to use.');
            } else {
                vscode.window.showErrorMessage('❌ Connection failed. Please check your configuration.');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`❌ Connection test failed: ${error}`);
        }
    }

    private getHelpHtml(status: ConfigurationStatus): string {
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
                .status {
                    background: var(--vscode-textBlockQuote-background);
                    border-left: 4px solid var(--vscode-textLink-foreground);
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 0 8px 8px 0;
                }
                .issue {
                    background: var(--vscode-inputValidation-errorBackground);
                    border-left: 4px solid var(--vscode-inputValidation-errorBorder);
                    padding: 10px 15px;
                    margin: 10px 0;
                    border-radius: 0 6px 6px 0;
                }
                .recommendation {
                    background: var(--vscode-inputValidation-infoBackground);
                    border-left: 4px solid var(--vscode-textLink-foreground);
                    padding: 10px 15px;
                    margin: 10px 0;
                    border-radius: 0 6px 6px 0;
                }
                .btn {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin: 5px;
                    text-decoration: none;
                    display: inline-block;
                }
                .btn:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                .btn-primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                .provider-info {
                    background: var(--vscode-textBlockQuote-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 8px;
                    padding: 15px;
                    margin: 15px 0;
                }
                h1, h2, h3 { color: var(--vscode-textLink-foreground); }
                ul { padding-left: 20px; }
                li { margin: 5px 0; }
            </style>
        </head>
        <body>
            <h1>🤖 AI Code Generator Setup Help</h1>
            
            <div class="status">
                <h3>Current Status</h3>
                <p><strong>Provider:</strong> ${status.provider.toUpperCase()}</p>
                <p><strong>API Key:</strong> ${status.hasApiKey ? '✅ Configured' : '❌ Missing'}</p>
                <p><strong>Connection:</strong> ${status.canConnect ? '✅ Working' : '❌ Failed'}</p>
                <p><strong>Overall:</strong> ${status.isConfigured ? '✅ Ready' : '❌ Needs Setup'}</p>
            </div>

            ${status.issues.length > 0 ? `
            <h3>🚨 Issues Found</h3>
            ${status.issues.map(issue => `<div class="issue">${issue}</div>`).join('')}
            ` : ''}

            ${status.recommendations.length > 0 ? `
            <h3>💡 Recommendations</h3>
            ${status.recommendations.map(rec => `<div class="recommendation">${rec}</div>`).join('')}
            ` : ''}

            <h3>🛠️ Quick Actions</h3>
            <button class="btn btn-primary" onclick="openSettings()">Open Settings</button>
            <button class="btn" onclick="openApiKey('${status.provider}')">Get API Key</button>
            <button class="btn" onclick="testConnection()">Test Connection</button>

            <div class="provider-info">
                <h3>📋 Setup Instructions for ${status.provider.toUpperCase()}</h3>
                ${this.getProviderInstructions(status.provider)}
            </div>

            <h3>🎯 What You Can Do Once Configured</h3>
            <ul>
                <li>Generate code from natural language descriptions</li>
                <li>Explain complex code sections</li>
                <li>Fix bugs and improve code quality</li>
                <li>Generate comprehensive unit tests</li>
                <li>Create entire projects from descriptions</li>
                <li>Analyze codebases for security and performance issues</li>
                <li>Chat with AI for coding assistance</li>
            </ul>

            <script>
                const vscode = acquireVsCodeApi();
                
                function openSettings() {
                    vscode.postMessage({ type: 'openSettings' });
                }
                
                function openApiKey(provider) {
                    vscode.postMessage({ type: 'openApiKey', provider });
                }
                
                function testConnection() {
                    vscode.postMessage({ type: 'testConnection' });
                }
            </script>
        </body>
        </html>
        `;
    }

    private getProviderInstructions(provider: string): string {
        switch (provider) {
            case 'gemini':
                return `
                <ol>
                    <li>Visit <a href="https://makersuite.google.com/app/apikey">Google AI Studio</a></li>
                    <li>Sign in with your Google account</li>
                    <li>Click "Create API Key"</li>
                    <li>Copy the generated API key</li>
                    <li>In VS Code Settings, set "AI Code Generator › Gemini: Api Key"</li>
                </ol>
                <p><strong>💰 Cost:</strong> Free tier with generous limits</p>
                `;
            case 'openai':
                return `
                <ol>
                    <li>Visit <a href="https://platform.openai.com/api-keys">OpenAI Platform</a></li>
                    <li>Sign in or create an account</li>
                    <li>Click "Create new secret key"</li>
                    <li>Copy the generated API key</li>
                    <li>In VS Code Settings, set "AI Code Generator › Openai: Api Key"</li>
                </ol>
                <p><strong>💰 Cost:</strong> Pay-per-use, requires payment method</p>
                `;
            case 'anthropic':
                return `
                <ol>
                    <li>Visit <a href="https://console.anthropic.com/">Anthropic Console</a></li>
                    <li>Sign in or create an account</li>
                    <li>Navigate to API Keys section</li>
                    <li>Create a new API key</li>
                    <li>In VS Code Settings, set "AI Code Generator › Anthropic: Api Key"</li>
                </ol>
                <p><strong>💰 Cost:</strong> Pay-per-use with free credits for new users</p>
                `;
            case 'ollama':
                return `
                <ol>
                    <li>Download Ollama from <a href="https://ollama.ai">ollama.ai</a></li>
                    <li>Install and start Ollama</li>
                    <li>Run: <code>ollama pull codellama</code> (or another model)</li>
                    <li>Ensure Ollama is running on http://localhost:11434</li>
                    <li>No API key needed - runs locally!</li>
                </ol>
                <p><strong>💰 Cost:</strong> Free - runs on your machine</p>
                `;
            default:
                return '<p>Please refer to the provider documentation for setup instructions.</p>';
        }
    }
}