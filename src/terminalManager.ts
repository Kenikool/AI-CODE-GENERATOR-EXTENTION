import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec, spawn, ChildProcess } from 'child_process';
import { AIProvider, AIMessage } from './aiProvider';

export interface PackageManager {
    name: string;
    installCommand: string;
    installDevCommand: string;
    runCommand: string;
    detectFiles: string[];
    lockFile: string;
}

export interface DependencyInfo {
    name: string;
    version: string;
    type: 'dependency' | 'devDependency';
    description?: string;
    conflicts?: string[];
}

export interface TerminalCommand {
    command: string;
    description: string;
    workingDirectory?: string;
    expectOutput?: boolean;
    timeout?: number;
}

export class TerminalManager {
    private terminals: Map<string, vscode.Terminal> = new Map();
    private packageManagers: PackageManager[] = [];
    private runningProcesses: Map<string, ChildProcess> = new Map();

    constructor(private aiProvider: AIProvider) {
        this.initializePackageManagers();
    }

    public async executeCommand(
        command: string,
        workingDirectory?: string,
        showOutput: boolean = true,
        cancellationToken?: vscode.CancellationToken
    ): Promise<{ success: boolean; output: string; error?: string }> {
        return new Promise((resolve) => {
            const cwd: string = workingDirectory || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();

            if (showOutput) {
                vscode.window.showInformationMessage(`🔄 Executing: ${command}`);
            }

            const childProcess = exec(command, { cwd, timeout: 300000 }, (error, stdout, stderr) => {
                if (cancellationToken?.isCancellationRequested) {
                    resolve({ success: false, output: '', error: 'Cancelled by user' });
                    return;
                }

                if (error) {
                    if (showOutput) {
                        vscode.window.showErrorMessage(`❌ Command failed: ${error.message}`);
                    }
                    resolve({ success: false, output: stdout, error: error.message });
                } else {
                    if (showOutput) {
                        vscode.window.showInformationMessage(`✅ Command completed successfully`);
                    }
                    resolve({ success: true, output: stdout });
                }
            });

            // Handle cancellation
            if (cancellationToken) {
                cancellationToken.onCancellationRequested(() => {
                    childProcess.kill();
                    resolve({ success: false, output: '', error: 'Cancelled by user' });
                });
            }
        });
    }

    public async executeInTerminal(
        command: string,
        terminalName: string = 'AI Code Generator',
        workingDirectory?: string,
        focus: boolean = true
    ): Promise<void> {
        let terminal = this.terminals.get(terminalName);
        
        if (!terminal || terminal.exitStatus !== undefined) {
            terminal = vscode.window.createTerminal({
                name: terminalName,
                cwd: workingDirectory || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
            });
            this.terminals.set(terminalName, terminal);
        }

        terminal.sendText(command);
        
        if (focus) {
            terminal.show();
        }
    }

    public async installDependencies(
        dependencies: string[],
        isDev: boolean = false,
        packageManager?: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<{ success: boolean; installed: string[]; failed: string[]; output: string }> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder found');
            }

            const projectPath = workspaceFolder.uri.fsPath;
            const detectedPM = packageManager || await this.detectPackageManager(projectPath);
            const pm = this.packageManagers.find(p => p.name === detectedPM);
            
            if (!pm) {
                throw new Error(`Package manager ${detectedPM} not supported`);
            }

            // Check for conflicts before installing
            const conflicts = await this.checkDependencyConflicts(dependencies, projectPath);
            if (conflicts.length > 0) {
                const proceed = await vscode.window.showWarningMessage(
                    `Potential conflicts detected: ${conflicts.join(', ')}. Continue anyway?`,
                    'Yes', 'No'
                );
                if (proceed !== 'Yes') {
                    return { success: false, installed: [], failed: dependencies, output: 'Installation cancelled due to conflicts' };
                }
            }

            const installed: string[] = [];
            const failed: string[] = [];
            let fullOutput = '';

            // Install dependencies one by one for better error handling
            for (const dep of dependencies) {
                const command = isDev ? 
                    `${pm.installDevCommand} ${dep}` : 
                    `${pm.installCommand} ${dep}`;

                vscode.window.showInformationMessage(`📦 Installing ${dep}...`);

                const result = await this.executeCommand(command, projectPath, false, cancellationToken);
                fullOutput += `\n--- Installing ${dep} ---\n${result.output}`;

                if (result.success) {
                    installed.push(dep);
                    vscode.window.showInformationMessage(`✅ Installed ${dep}`);
                } else {
                    failed.push(dep);
                    vscode.window.showErrorMessage(`❌ Failed to install ${dep}: ${result.error}`);
                }

                if (cancellationToken?.isCancellationRequested) {
                    break;
                }
            }

            const success = failed.length === 0;
            const message = success ? 
                `✅ All dependencies installed successfully!` :
                `⚠️ ${installed.length} installed, ${failed.length} failed`;

            vscode.window.showInformationMessage(message);

            return { success, installed, failed, output: fullOutput };

        } catch (error) {
            vscode.window.showErrorMessage(`Error installing dependencies: ${error}`);
            return { success: false, installed: [], failed: dependencies, output: `Error: ${error}` };
        }
    }

    public async runScript(
        scriptName: string,
        args: string[] = [],
        terminalName: string = 'Script Runner',
        cancellationToken?: vscode.CancellationToken
    ): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder found');
            }

            const projectPath = workspaceFolder.uri.fsPath;
            const packageManager = await this.detectPackageManager(projectPath);
            const pm = this.packageManagers.find(p => p.name === packageManager);
            
            if (!pm) {
                throw new Error(`Package manager ${packageManager} not supported`);
            }

            const command = `${pm.runCommand} ${scriptName} ${args.join(' ')}`.trim();
            await this.executeInTerminal(command, terminalName, projectPath);

        } catch (error) {
            vscode.window.showErrorMessage(`Error running script: ${error}`);
        }
    }

    public async smartInstall(
        projectType: string,
        features: string[] = [],
        cancellationToken?: vscode.CancellationToken
    ): Promise<void> {
        try {
            // Get AI recommendations for dependencies
            const recommendations = await this.getAIRecommendations(projectType, features, cancellationToken);
            
            if (recommendations.dependencies.length === 0 && recommendations.devDependencies.length === 0) {
                vscode.window.showInformationMessage('No dependencies recommended for this setup');
                return;
            }

            // Show recommendations to user
            const message = `AI recommends installing:\n\nDependencies: ${recommendations.dependencies.join(', ')}\nDev Dependencies: ${recommendations.devDependencies.join(', ')}\n\nProceed with installation?`;
            
            const choice = await vscode.window.showInformationMessage(
                message,
                { modal: true },
                'Install All',
                'Select Dependencies',
                'Cancel'
            );

            if (choice === 'Cancel') return;

            let depsToInstall = recommendations.dependencies;
            let devDepsToInstall = recommendations.devDependencies;

            if (choice === 'Select Dependencies') {
                // Let user select which dependencies to install
                const allDeps = [
                    ...recommendations.dependencies.map(d => ({ label: d, type: 'dependency' })),
                    ...recommendations.devDependencies.map(d => ({ label: d, type: 'devDependency' }))
                ];

                const selected = await vscode.window.showQuickPick(allDeps, {
                    canPickMany: true,
                    placeHolder: 'Select dependencies to install'
                });

                if (!selected || selected.length === 0) return;

                depsToInstall = selected.filter(s => s.type === 'dependency').map(s => s.label);
                devDepsToInstall = selected.filter(s => s.type === 'devDependency').map(s => s.label);
            }

            // Install dependencies
            if (depsToInstall.length > 0) {
                await this.installDependencies(depsToInstall, false, undefined, cancellationToken);
            }

            if (devDepsToInstall.length > 0) {
                await this.installDependencies(devDepsToInstall, true, undefined, cancellationToken);
            }

            // Execute post-install commands
            if (recommendations.postInstallCommands.length > 0) {
                for (const command of recommendations.postInstallCommands) {
                    await this.executeInTerminal(command, 'Post Install Setup');
                }
            }

        } catch (error) {
            vscode.window.showErrorMessage(`Error in smart install: ${error}`);
        }
    }

    public async setupDevelopmentEnvironment(
        projectType: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder found');
            }

            const projectPath = workspaceFolder.uri.fsPath;

            // Get AI recommendations for development setup
            const setup = await this.getDevEnvironmentSetup(projectType, cancellationToken);

            vscode.window.showInformationMessage(`🔧 Setting up ${projectType} development environment...`);

            // Execute setup commands
            for (const command of setup.commands) {
                vscode.window.showInformationMessage(`🔄 ${command.description}`);
                
                if (command.expectOutput) {
                    const result = await this.executeCommand(
                        command.command, 
                        command.workingDirectory || projectPath,
                        true,
                        cancellationToken
                    );
                    
                    if (!result.success) {
                        vscode.window.showErrorMessage(`Failed: ${command.description}`);
                        return;
                    }
                } else {
                    await this.executeInTerminal(
                        command.command,
                        'Dev Environment Setup',
                        command.workingDirectory || projectPath,
                        false
                    );
                }

                if (cancellationToken?.isCancellationRequested) {
                    break;
                }
            }

            // Create configuration files
            for (const [fileName, content] of Object.entries(setup.configFiles)) {
                const filePath = path.join(projectPath, fileName);
                const dir = path.dirname(filePath);
                
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                
                fs.writeFileSync(filePath, content);
            }

            vscode.window.showInformationMessage(`✅ Development environment setup complete!`);

        } catch (error) {
            vscode.window.showErrorMessage(`Error setting up development environment: ${error}`);
        }
    }

    public async detectPackageManager(projectPath: string): Promise<string> {
        for (const pm of this.packageManagers) {
            for (const file of pm.detectFiles) {
                if (fs.existsSync(path.join(projectPath, file))) {
                    return pm.name;
                }
            }
        }
        
        // Default to npm if no package manager detected
        return 'npm';
    }

    public async checkDependencyConflicts(
        dependencies: string[],
        projectPath: string
    ): Promise<string[]> {
        const conflicts: string[] = [];
        
        try {
            const packageJsonPath = path.join(projectPath, 'package.json');
            if (!fs.existsSync(packageJsonPath)) {
                return conflicts;
            }

            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const existingDeps = {
                ...packageJson.dependencies || {},
                ...packageJson.devDependencies || {}
            };

            for (const dep of dependencies) {
                const depName = dep.split('@')[0]; // Remove version if specified
                
                if (existingDeps[depName]) {
                    conflicts.push(`${depName} (already installed: ${existingDeps[depName]})`);
                }
            }

        } catch (error) {
            console.error('Error checking dependency conflicts:', error);
        }

        return conflicts;
    }

    public async getInstalledPackages(projectPath: string): Promise<DependencyInfo[]> {
        const packages: DependencyInfo[] = [];
        
        try {
            const packageJsonPath = path.join(projectPath, 'package.json');
            if (!fs.existsSync(packageJsonPath)) {
                return packages;
            }

            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            
            // Add dependencies
            for (const [name, version] of Object.entries(packageJson.dependencies || {})) {
                packages.push({
                    name,
                    version: version as string,
                    type: 'dependency'
                });
            }

            // Add dev dependencies
            for (const [name, version] of Object.entries(packageJson.devDependencies || {})) {
                packages.push({
                    name,
                    version: version as string,
                    type: 'devDependency'
                });
            }

        } catch (error) {
            console.error('Error getting installed packages:', error);
        }

        return packages;
    }

    private async getAIRecommendations(
        projectType: string,
        features: string[],
        cancellationToken?: vscode.CancellationToken
    ): Promise<{
        dependencies: string[];
        devDependencies: string[];
        postInstallCommands: string[];
    }> {
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are an expert developer and package manager. Recommend the best dependencies for a project based on its type and features.

Return a JSON object with this structure:
{
  "dependencies": ["package1", "package2"],
  "devDependencies": ["dev-package1", "dev-package2"],
  "postInstallCommands": ["command1", "command2"]
}

Rules:
1. Only recommend essential, well-maintained packages
2. Prefer packages with good documentation and community support
3. Avoid deprecated or unmaintained packages
4. Include version numbers only if specific versions are required
5. Keep the list focused and avoid bloat
6. Include post-install commands for setup if needed`
            },
            {
                role: 'user',
                content: `Recommend dependencies for:
Project Type: ${projectType}
Features: ${features.join(', ')}

Provide essential dependencies and dev dependencies for this setup.`
            }
        ];

        try {
            const response = await this.aiProvider.generateResponse(messages, cancellationToken);
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.error('Error getting AI recommendations:', error);
        }

        // Fallback recommendations
        return {
            dependencies: [],
            devDependencies: [],
            postInstallCommands: []
        };
    }

    private async getDevEnvironmentSetup(
        projectType: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<{
        commands: TerminalCommand[];
        configFiles: { [fileName: string]: string };
    }> {
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are an expert developer. Create a development environment setup for the specified project type.

Return a JSON object with this structure:
{
  "commands": [
    {
      "command": "terminal command",
      "description": "what this command does",
      "expectOutput": true/false,
      "timeout": 30000
    }
  ],
  "configFiles": {
    "filename": "file content"
  }
}

Include:
1. Essential development tools setup
2. Code formatting and linting configuration
3. Testing framework setup
4. Build tool configuration
5. Development server setup
6. Environment configuration files

Make it production-ready and follow best practices.`
            },
            {
                role: 'user',
                content: `Create development environment setup for: ${projectType}

Include all necessary commands and configuration files for a complete development setup.`
            }
        ];

        try {
            const response = await this.aiProvider.generateResponse(messages, cancellationToken);
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.error('Error getting dev environment setup:', error);
        }

        // Fallback setup
        return {
            commands: [],
            configFiles: {}
        };
    }

    private initializePackageManagers(): void {
        this.packageManagers = [
            {
                name: 'npm',
                installCommand: 'npm install',
                installDevCommand: 'npm install --save-dev',
                runCommand: 'npm run',
                detectFiles: ['package.json'],
                lockFile: 'package-lock.json'
            },
            {
                name: 'yarn',
                installCommand: 'yarn add',
                installDevCommand: 'yarn add --dev',
                runCommand: 'yarn',
                detectFiles: ['yarn.lock'],
                lockFile: 'yarn.lock'
            },
            {
                name: 'pnpm',
                installCommand: 'pnpm add',
                installDevCommand: 'pnpm add --save-dev',
                runCommand: 'pnpm run',
                detectFiles: ['pnpm-lock.yaml'],
                lockFile: 'pnpm-lock.yaml'
            },
            {
                name: 'pip',
                installCommand: 'pip install',
                installDevCommand: 'pip install',
                runCommand: 'python',
                detectFiles: ['requirements.txt', 'setup.py', 'pyproject.toml'],
                lockFile: 'requirements.txt'
            },
            {
                name: 'composer',
                installCommand: 'composer require',
                installDevCommand: 'composer require --dev',
                runCommand: 'composer run',
                detectFiles: ['composer.json'],
                lockFile: 'composer.lock'
            },
            {
                name: 'cargo',
                installCommand: 'cargo add',
                installDevCommand: 'cargo add --dev',
                runCommand: 'cargo run',
                detectFiles: ['Cargo.toml'],
                lockFile: 'Cargo.lock'
            },
            {
                name: 'go',
                installCommand: 'go get',
                installDevCommand: 'go get',
                runCommand: 'go run',
                detectFiles: ['go.mod'],
                lockFile: 'go.sum'
            }
        ];
    }

    public dispose(): void {
        // Clean up terminals
        for (const terminal of this.terminals.values()) {
            terminal.dispose();
        }
        this.terminals.clear();

        // Kill running processes
        for (const process of this.runningProcesses.values()) {
            process.kill();
        }
        this.runningProcesses.clear();
    }
}