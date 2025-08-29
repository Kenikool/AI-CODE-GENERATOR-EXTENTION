import * as vscode from 'vscode';
import { AIProvider } from '../aiProvider';

export interface ProviderCredentials {
    apiKey: string;
    endpoint?: string;
    model?: string;
}

export interface LoginStatus {
    isLoggedIn: boolean;
    provider: string;
    lastLogin?: Date;
    error?: string;
}

export class AuthenticationManager {
    private static instance: AuthenticationManager;
    private context: vscode.ExtensionContext;
    private statusBarItem: vscode.StatusBarItem;
    private loginStatuses: Map<string, LoginStatus> = new Map();

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.statusBarItem.command = 'aiCodeGenerator.showLoginStatus';
        this.updateStatusBar();
        this.statusBarItem.show();
        
        // Load existing login statuses
        this.loadLoginStatuses();
    }

    public static getInstance(context?: vscode.ExtensionContext): AuthenticationManager {
        if (!AuthenticationManager.instance && context) {
            AuthenticationManager.instance = new AuthenticationManager(context);
        }
        return AuthenticationManager.instance;
    }

    private async loadLoginStatuses() {
        const providers = ['openai', 'qodo', 'anthropic', 'ollama'];
        
        for (const provider of providers) {
            const credentials = await this.getStoredCredentials(provider);
            if (credentials) {
                this.loginStatuses.set(provider, {
                    isLoggedIn: true,
                    provider,
                    lastLogin: new Date()
                });
            } else {
                this.loginStatuses.set(provider, {
                    isLoggedIn: false,
                    provider
                });
            }
        }
        
        this.updateStatusBar();
    }

    public async login(provider: string, credentials: ProviderCredentials): Promise<boolean> {
        try {
            // Validate credentials by testing the connection
            const isValid = await this.validateCredentials(provider, credentials);
            
            if (!isValid) {
                this.loginStatuses.set(provider, {
                    isLoggedIn: false,
                    provider,
                    error: 'Invalid credentials or connection failed'
                });
                this.updateStatusBar();
                return false;
            }

            // Store credentials securely
            await this.storeCredentials(provider, credentials);
            
            // Update login status
            this.loginStatuses.set(provider, {
                isLoggedIn: true,
                provider,
                lastLogin: new Date()
            });
            
            this.updateStatusBar();
            
            vscode.window.showInformationMessage(`Successfully logged in to ${provider.toUpperCase()}`);
            return true;
            
        } catch (error) {
            const errorMessage = `Login failed for ${provider}: ${error}`;
            this.loginStatuses.set(provider, {
                isLoggedIn: false,
                provider,
                error: errorMessage
            });
            this.updateStatusBar();
            vscode.window.showErrorMessage(errorMessage);
            return false;
        }
    }

    public async logout(provider: string): Promise<void> {
        try {
            // Clear stored credentials
            await this.clearCredentials(provider);
            
            // Update login status
            this.loginStatuses.set(provider, {
                isLoggedIn: false,
                provider
            });
            
            this.updateStatusBar();
            
            vscode.window.showInformationMessage(`Logged out from ${provider.toUpperCase()}`);
            
        } catch (error) {
            vscode.window.showErrorMessage(`Logout failed for ${provider}: ${error}`);
        }
    }

    public async logoutAll(): Promise<void> {
        const providers = Array.from(this.loginStatuses.keys());
        
        for (const provider of providers) {
            await this.logout(provider);
        }
        
        vscode.window.showInformationMessage('Logged out from all providers');
    }

    public isLoggedIn(provider: string): boolean {
        const status = this.loginStatuses.get(provider);
        return status?.isLoggedIn || false;
    }

    public getLoginStatus(provider: string): LoginStatus | undefined {
        return this.loginStatuses.get(provider);
    }

    public getAllLoginStatuses(): Map<string, LoginStatus> {
        return new Map(this.loginStatuses);
    }

    public async getStoredCredentials(provider: string): Promise<ProviderCredentials | undefined> {
        try {
            const credentialsJson = await this.context.secrets.get(`aiCodeGenerator.${provider}.credentials`);
            if (credentialsJson) {
                return JSON.parse(credentialsJson);
            }
        } catch (error) {
            console.error(`Error retrieving credentials for ${provider}:`, error);
        }
        return undefined;
    }

    private async storeCredentials(provider: string, credentials: ProviderCredentials): Promise<void> {
        const credentialsJson = JSON.stringify(credentials);
        await this.context.secrets.store(`aiCodeGenerator.${provider}.credentials`, credentialsJson);
    }

    private async clearCredentials(provider: string): Promise<void> {
        await this.context.secrets.delete(`aiCodeGenerator.${provider}.credentials`);
    }

    private async validateCredentials(provider: string, credentials: ProviderCredentials): Promise<boolean> {
        try {
            // Create a temporary AI provider instance to test the credentials
            const tempAIProvider = new AIProvider();
            
            // Temporarily set the credentials in configuration for testing
            const config = vscode.workspace.getConfiguration('aiCodeGenerator');
            const originalProvider = config.get('provider');
            
            // Update configuration temporarily
            await config.update('provider', provider, vscode.ConfigurationTarget.Global);
            
            switch (provider) {
                case 'openai':
                    await config.update('openai.apiKey', credentials.apiKey, vscode.ConfigurationTarget.Global);
                    if (credentials.model) {
                        await config.update('openai.model', credentials.model, vscode.ConfigurationTarget.Global);
                    }
                    break;
                    
                case 'qodo':
                    await config.update('qodo.apiKey', credentials.apiKey, vscode.ConfigurationTarget.Global);
                    if (credentials.endpoint) {
                        await config.update('qodo.endpoint', credentials.endpoint, vscode.ConfigurationTarget.Global);
                    }
                    break;
                    
                case 'anthropic':
                    await config.update('anthropic.apiKey', credentials.apiKey, vscode.ConfigurationTarget.Global);
                    if (credentials.model) {
                        await config.update('anthropic.model', credentials.model, vscode.ConfigurationTarget.Global);
                    }
                    break;
                    
                case 'ollama':
                    if (credentials.endpoint) {
                        await config.update('ollama.endpoint', credentials.endpoint, vscode.ConfigurationTarget.Global);
                    }
                    if (credentials.model) {
                        await config.update('ollama.model', credentials.model, vscode.ConfigurationTarget.Global);
                    }
                    break;
            }
            
            // Update the AI provider configuration
            tempAIProvider.updateConfiguration();
            
            // Test the connection
            const isValid = await tempAIProvider.testConnection();
            
            // Restore original configuration
            await config.update('provider', originalProvider, vscode.ConfigurationTarget.Global);
            
            return isValid;
            
        } catch (error) {
            console.error(`Credential validation failed for ${provider}:`, error);
            return false;
        }
    }

    private updateStatusBar(): void {
        const loggedInProviders = Array.from(this.loginStatuses.values())
            .filter(status => status.isLoggedIn)
            .map(status => status.provider.toUpperCase());
            
        if (loggedInProviders.length === 0) {
            this.statusBarItem.text = '$(account) Not Logged In';
            this.statusBarItem.tooltip = 'Click to login to AI providers';
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            this.statusBarItem.text = `$(account) ${loggedInProviders.join(', ')}`;
            this.statusBarItem.tooltip = `Logged in to: ${loggedInProviders.join(', ')}\nClick to manage login status`;
            this.statusBarItem.backgroundColor = undefined;
        }
    }

    public async showLoginStatusQuickPick(): Promise<void> {
        const items: vscode.QuickPickItem[] = [];
        
        // Add login status for each provider
        for (const [provider, status] of this.loginStatuses) {
            const icon = status.isLoggedIn ? '$(check)' : '$(x)';
            const label = `${icon} ${provider.toUpperCase()}`;
            const description = status.isLoggedIn 
                ? `Logged in ${status.lastLogin ? '• ' + status.lastLogin.toLocaleString() : ''}`
                : status.error || 'Not logged in';
                
            items.push({
                label,
                description,
                detail: status.isLoggedIn ? 'Click to logout' : 'Click to login'
            });
        }
        
        // Add management options
        items.push(
            { label: '', kind: vscode.QuickPickItemKind.Separator },
            { label: '$(sign-in) Login to Provider', description: 'Add new login credentials' },
            { label: '$(sign-out) Logout from All', description: 'Clear all stored credentials' }
        );
        
        const selected = await vscode.window.showQuickPick(items, {
            title: 'AI Provider Login Status',
            placeHolder: 'Select an action'
        });
        
        if (!selected) {
            return;
        }
        
        if (selected.label.includes('Login to Provider')) {
            await vscode.commands.executeCommand('aiCodeGenerator.login');
        } else if (selected.label.includes('Logout from All')) {
            await this.logoutAll();
        } else {
            // Handle individual provider actions
            const provider = selected.label.replace(/^\$\([^)]+\)\s+/, '').toLowerCase();
            const status = this.loginStatuses.get(provider);
            
            if (status?.isLoggedIn) {
                await this.logout(provider);
            } else {
                await vscode.commands.executeCommand('aiCodeGenerator.login', provider);
            }
        }
    }

    public dispose(): void {
        this.statusBarItem.dispose();
    }
}