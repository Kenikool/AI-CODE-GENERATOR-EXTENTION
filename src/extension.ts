import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AIProvider } from './aiProvider';
import { CodeGenerator } from './codeGenerator';
import { ChatWebviewProvider } from './webview/chatWebviewProvider';
import { ProjectBuilder } from './projectBuilder';
import { CodebaseAnalyzer } from './codebaseAnalyzer';
import { IntelligentCompletion } from './intelligentCompletion';
import { FileSystemManager } from './fileSystemManager';
import { TerminalManager } from './terminalManager';
import { ProjectScaffolder } from './projectScaffolder';
import { EnhancedAutocomplete } from './enhancedAutocomplete';
import { AdvancedScanner } from './advancedScanner';
import { DebuggingAssistant } from './debuggingAssistant';
import { DashboardProvider } from './ui/dashboardProvider';
import { SubscriptionManager } from './subscription/subscriptionManager';
import { PaymentProvider } from './subscription/paymentProvider';

let aiProvider: AIProvider;
let codeGenerator: CodeGenerator;
let chatWebviewProvider: ChatWebviewProvider;
let projectBuilder: ProjectBuilder;
let codebaseAnalyzer: CodebaseAnalyzer;
let intelligentCompletion: IntelligentCompletion;
let fileSystemManager: FileSystemManager;
let terminalManager: TerminalManager;
let projectScaffolder: ProjectScaffolder;
let enhancedAutocomplete: EnhancedAutocomplete;
let advancedScanner: AdvancedScanner;
let debuggingAssistant: DebuggingAssistant;
let dashboardProvider: DashboardProvider;
let subscriptionManager: SubscriptionManager;
let paymentProvider: PaymentProvider;
export function activate(context: vscode.ExtensionContext) {
    console.log('AI Code Generator extension is now active!');

    // Initialize AI provider and all components
    aiProvider = new AIProvider();
    codeGenerator = new CodeGenerator(aiProvider);
    chatWebviewProvider = new ChatWebviewProvider(context.extensionUri, aiProvider);
    projectBuilder = new ProjectBuilder(aiProvider);
    codebaseAnalyzer = new CodebaseAnalyzer(aiProvider);
    intelligentCompletion = new IntelligentCompletion(aiProvider);
    fileSystemManager = new FileSystemManager(aiProvider);
    terminalManager = new TerminalManager(aiProvider);
    projectScaffolder = new ProjectScaffolder(aiProvider, fileSystemManager, terminalManager);
    
    // Initialize new advanced features
    paymentProvider = new PaymentProvider();
    subscriptionManager = new SubscriptionManager(paymentProvider);
    enhancedAutocomplete = new EnhancedAutocomplete(aiProvider);
    advancedScanner = new AdvancedScanner(aiProvider);
    debuggingAssistant = new DebuggingAssistant(aiProvider);
    dashboardProvider = new DashboardProvider(context.extensionUri, aiProvider, advancedScanner, subscriptionManager);

    // Register webview providers
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            ChatWebviewProvider.viewType,
            chatWebviewProvider
        ),
        vscode.window.registerWebviewViewProvider(
            DashboardProvider.viewType,
            dashboardProvider
        )
    );

    // Register commands
    const commands = [
        // Original commands
        vscode.commands.registerCommand('aiCodeGenerator.generateCode', generateCode),
        vscode.commands.registerCommand('aiCodeGenerator.explainCode', explainCode),
        vscode.commands.registerCommand('aiCodeGenerator.fixCode', fixCode),
        vscode.commands.registerCommand('aiCodeGenerator.generateTests', generateTests),
        vscode.commands.registerCommand('aiCodeGenerator.refactorCode', refactorCode),
        vscode.commands.registerCommand('aiCodeGenerator.addComments', addComments),
        vscode.commands.registerCommand('aiCodeGenerator.openChat', openChat),
        
        // Advanced project building commands
        vscode.commands.registerCommand('aiCodeGenerator.buildProject', buildProjectFromDescription),
        vscode.commands.registerCommand('aiCodeGenerator.createTemplate', createProjectTemplate),
        vscode.commands.registerCommand('aiCodeGenerator.enhanceProject', enhanceExistingProject),
        vscode.commands.registerCommand('aiCodeGenerator.generateDocs', generateDocumentation),
        
        // Codebase analysis commands
        vscode.commands.registerCommand('aiCodeGenerator.analyzeCodebase', analyzeFullCodebase),
        vscode.commands.registerCommand('aiCodeGenerator.analyzeFiles', analyzeSpecificFiles),
        vscode.commands.registerCommand('aiCodeGenerator.createRefactoringPlan', createRefactoringPlan),
        vscode.commands.registerCommand('aiCodeGenerator.findPatterns', findCodePatterns),
        vscode.commands.registerCommand('aiCodeGenerator.generateTestStrategy', generateTestStrategy),
        vscode.commands.registerCommand('aiCodeGenerator.optimizePerformance', optimizePerformance),
        
        // File & Folder Management commands
        vscode.commands.registerCommand('aiCodeGenerator.createSmartFile', createSmartFile),
        vscode.commands.registerCommand('aiCodeGenerator.createSmartFolder', createSmartFolder),
        vscode.commands.registerCommand('aiCodeGenerator.createFromTemplate', createFromTemplate),
        vscode.commands.registerCommand('aiCodeGenerator.createMultipleFiles', createMultipleFiles),
        
        // Terminal & Dependency Management commands
        vscode.commands.registerCommand('aiCodeGenerator.installDependencies', installDependencies),
        vscode.commands.registerCommand('aiCodeGenerator.runScript', runScript),
        vscode.commands.registerCommand('aiCodeGenerator.smartInstall', smartInstall),
        vscode.commands.registerCommand('aiCodeGenerator.setupDevEnvironment', setupDevEnvironment),
        
        // Advanced Project Scaffolding commands
        vscode.commands.registerCommand('aiCodeGenerator.createFullProject', createFullProject),
        vscode.commands.registerCommand('aiCodeGenerator.createAdvancedStructure', createAdvancedStructure),
        vscode.commands.registerCommand('aiCodeGenerator.setupMicroservices', setupMicroservices),
        vscode.commands.registerCommand('aiCodeGenerator.createComponentLibrary', createComponentLibrary),
        
        // Debugging Assistant commands
        vscode.commands.registerCommand('aiCodeGenerator.analyzeError', analyzeError),
        vscode.commands.registerCommand('aiCodeGenerator.suggestBreakpoints', suggestBreakpoints),
        vscode.commands.registerCommand('aiCodeGenerator.generateDebugScript', generateDebugScript),
        
        // Subscription & Payment commands
        vscode.commands.registerCommand('aiCodeGenerator.showSubscriptionPlans', showSubscriptionPlans),
        vscode.commands.registerCommand('aiCodeGenerator.purchaseCredits', purchaseCredits),
        vscode.commands.registerCommand('aiCodeGenerator.showUsageDetails', showUsageDetails),
        vscode.commands.registerCommand('aiCodeGenerator.manageSubscription', manageSubscription),
        
        // Dashboard commands
        vscode.commands.registerCommand('aiCodeGenerator.openDashboard', openDashboard),
        vscode.commands.registerCommand('aiCodeGenerator.refreshDashboard', refreshDashboard)
    ];

    context.subscriptions.push(...commands);

    // Set context for chat view
    vscode.commands.executeCommand('setContext', 'aiCodeGenerator.chatViewEnabled', true);

    // Listen for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('aiCodeGenerator')) {
                aiProvider.updateConfiguration();
            }
        })
    );
}

async function generateCode() {
    try {
        const prompt = await vscode.window.showInputBox({
            prompt: 'Describe the code you want to generate',
            placeHolder: 'e.g., Create a function that sorts an array of objects by name'
        });

        if (!prompt) {
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Generating code...',
            cancellable: true
        }, async (progress, token) => {
            const result = await codeGenerator.generateCode(prompt, editor, token);
            if (result && !token.isCancellationRequested) {
                await insertCodeAtCursor(editor, result);
            }
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error generating code: ${error}`);
    }
}

async function explainCode() {
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.selection.isEmpty) {
            vscode.window.showErrorMessage('Please select code to explain');
            return;
        }

        const selectedCode = editor.document.getText(editor.selection);
        
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Explaining code...',
            cancellable: true
        }, async (progress, token) => {
            const explanation = await codeGenerator.explainCode(selectedCode, editor, token);
            if (explanation && !token.isCancellationRequested) {
                await showExplanationPanel(explanation);
            }
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error explaining code: ${error}`);
    }
}

async function fixCode() {
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.selection.isEmpty) {
            vscode.window.showErrorMessage('Please select code to fix');
            return;
        }

        const selectedCode = editor.document.getText(editor.selection);
        
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Fixing code...',
            cancellable: true
        }, async (progress, token) => {
            const fixedCode = await codeGenerator.fixCode(selectedCode, editor, token);
            if (fixedCode && !token.isCancellationRequested) {
                await replaceSelectedCode(editor, fixedCode);
            }
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error fixing code: ${error}`);
    }
}

async function generateTests() {
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.selection.isEmpty) {
            vscode.window.showErrorMessage('Please select code to generate tests for');
            return;
        }

        const selectedCode = editor.document.getText(editor.selection);
        
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Generating tests...',
            cancellable: true
        }, async (progress, token) => {
            const tests = await codeGenerator.generateTests(selectedCode, editor, token);
            if (tests && !token.isCancellationRequested) {
                await createTestFile(tests, editor);
            }
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error generating tests: ${error}`);
    }
}

async function refactorCode() {
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.selection.isEmpty) {
            vscode.window.showErrorMessage('Please select code to refactor');
            return;
        }

        const selectedCode = editor.document.getText(editor.selection);
        
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Refactoring code...',
            cancellable: true
        }, async (progress, token) => {
            const refactoredCode = await codeGenerator.refactorCode(selectedCode, editor, token);
            if (refactoredCode && !token.isCancellationRequested) {
                await replaceSelectedCode(editor, refactoredCode);
            }
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error refactoring code: ${error}`);
    }
}

async function addComments() {
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.selection.isEmpty) {
            vscode.window.showErrorMessage('Please select code to add comments to');
            return;
        }

        const selectedCode = editor.document.getText(editor.selection);
        
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Adding comments...',
            cancellable: true
        }, async (progress, token) => {
            const commentedCode = await codeGenerator.addComments(selectedCode, editor, token);
            if (commentedCode && !token.isCancellationRequested) {
                await replaceSelectedCode(editor, commentedCode);
            }
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error adding comments: ${error}`);
    }
}

async function openChat() {
    await vscode.commands.executeCommand('aiCodeGenerator.chatView.focus');
}

async function insertCodeAtCursor(editor: vscode.TextEditor, code: string) {
    const position = editor.selection.active;
    await editor.edit(editBuilder => {
        editBuilder.insert(position, code);
    });
}

async function replaceSelectedCode(editor: vscode.TextEditor, code: string) {
    await editor.edit(editBuilder => {
        editBuilder.replace(editor.selection, code);
    });
}

async function showExplanationPanel(explanation: string) {
    const panel = vscode.window.createWebviewPanel(
        'codeExplanation',
        'Code Explanation',
        vscode.ViewColumn.Beside,
        {
            enableScripts: true
        }
    );

    panel.webview.html = getExplanationHtml(explanation);
}

async function createTestFile(tests: string, editor: vscode.TextEditor) {
    const currentFile = editor.document.fileName;
    const testFileName = currentFile.replace(/\.(ts|js|py|java|cpp|c)$/, '.test.$1');
    
    const testUri = vscode.Uri.file(testFileName);
    const testDocument = await vscode.workspace.openTextDocument(testUri);
    const testEditor = await vscode.window.showTextDocument(testDocument);
    
    await testEditor.edit(editBuilder => {
        editBuilder.insert(new vscode.Position(0, 0), tests);
    });
}

function getExplanationHtml(explanation: string): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Code Explanation</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    padding: 20px;
                    line-height: 1.6;
                }
                pre {
                    background-color: var(--vscode-textBlockQuote-background);
                    padding: 10px;
                    border-radius: 4px;
                    overflow-x: auto;
                }
                code {
                    background-color: var(--vscode-textBlockQuote-background);
                    padding: 2px 4px;
                    border-radius: 2px;
                }
            </style>
        </head>
        <body>
            <h1>Code Explanation</h1>
            <div>${explanation.replace(/\n/g, '<br>')}</div>
        </body>
        </html>
    `;
}

// Advanced Project Building Commands
async function buildProjectFromDescription() {
    try {
        const description = await vscode.window.showInputBox({
            prompt: 'Describe the project you want to build',
            placeHolder: 'e.g., A React e-commerce app with user authentication and payment processing'
        });

        if (!description) return;

        const workspaceFolder = await selectWorkspaceFolder();
        if (!workspaceFolder) return;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Building project from description...',
            cancellable: true
        }, async (progress, token) => {
            await projectBuilder.buildProjectFromDescription(description, workspaceFolder, token);
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error building project: ${error}`);
    }
}

async function createProjectTemplate() {
    try {
        const templateType = await vscode.window.showQuickPick([
            { label: 'React TypeScript App', value: 'react-typescript' },
            { label: 'Node.js API', value: 'node-api' },
            { label: 'Python Web App', value: 'python-web' },
            { label: 'Vue.js App', value: 'vue-app' },
            { label: 'Angular App', value: 'angular-app' },
            { label: 'Express API', value: 'express-api' },
            { label: 'FastAPI', value: 'fastapi' },
            { label: 'Spring Boot', value: 'spring-boot' }
        ], {
            placeHolder: 'Select project template type'
        });

        if (!templateType) return;

        const projectName = await vscode.window.showInputBox({
            prompt: 'Enter project name',
            placeHolder: 'my-awesome-project'
        });

        if (!projectName) return;

        const workspaceFolder = await selectWorkspaceFolder();
        if (!workspaceFolder) return;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Creating ${templateType.label}...`,
            cancellable: true
        }, async (progress, token) => {
            await projectBuilder.generateProjectTemplate(templateType.value, projectName, workspaceFolder, token);
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error creating template: ${error}`);
    }
}

async function enhanceExistingProject() {
    try {
        const enhancement = await vscode.window.showInputBox({
            prompt: 'Describe the enhancement you want to add',
            placeHolder: 'e.g., Add user authentication, Add database integration, Add testing setup'
        });

        if (!enhancement) return;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Enhancing project...',
            cancellable: true
        }, async (progress, token) => {
            await projectBuilder.enhanceExistingProject(enhancement, token);
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error enhancing project: ${error}`);
    }
}

async function generateDocumentation() {
    try {
        const docType = await vscode.window.showQuickPick([
            { label: 'API Documentation', value: 'api' },
            { label: 'User Documentation', value: 'user' },
            { label: 'Developer Documentation', value: 'developer' },
            { label: 'Deployment Documentation', value: 'deployment' }
        ], {
            placeHolder: 'Select documentation type'
        });

        if (!docType) return;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Generating ${docType.label}...`,
            cancellable: true
        }, async (progress, token) => {
            await projectBuilder.generateDocumentation(docType.value as any, token);
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error generating documentation: ${error}`);
    }
}

// Codebase Analysis Commands
async function analyzeFullCodebase() {
    try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Analyzing codebase...',
            cancellable: true
        }, async (progress, token) => {
            const insights = await codebaseAnalyzer.analyzeFullCodebase(workspaceFolder.uri.fsPath, token);
            await showCodebaseInsights(insights);
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error analyzing codebase: ${error}`);
    }
}

async function analyzeSpecificFiles() {
    try {
        const files = await vscode.window.showOpenDialog({
            canSelectMany: true,
            canSelectFiles: true,
            canSelectFolders: false,
            filters: {
                'Code files': ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'php', 'rb']
            }
        });

        if (!files || files.length === 0) return;

        const analysisType = await vscode.window.showQuickPick([
            { label: 'Security Analysis', value: 'security' },
            { label: 'Performance Analysis', value: 'performance' },
            { label: 'Code Quality', value: 'quality' },
            { label: 'Architecture Review', value: 'architecture' }
        ], {
            placeHolder: 'Select analysis type'
        });

        if (!analysisType) return;

        const filePaths = files.map(file => file.fsPath);

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Analyzing files for ${analysisType.label}...`,
            cancellable: true
        }, async (progress, token) => {
            const analysis = await codebaseAnalyzer.analyzeSpecificFiles(filePaths, analysisType.value as any, token);
            await showFileAnalysis(analysis);
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error analyzing files: ${error}`);
    }
}

async function createRefactoringPlan() {
    try {
        const files = await vscode.window.showOpenDialog({
            canSelectMany: true,
            canSelectFiles: true,
            canSelectFolders: false
        });

        if (!files || files.length === 0) return;

        const goal = await vscode.window.showInputBox({
            prompt: 'Describe your refactoring goal',
            placeHolder: 'e.g., Extract common functionality into reusable components, Improve error handling'
        });

        if (!goal) return;

        const filePaths = files.map(file => file.fsPath);

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Creating refactoring plan...',
            cancellable: true
        }, async (progress, token) => {
            const plan = await codebaseAnalyzer.generateRefactoringPlan(filePaths, goal, token);
            await showRefactoringPlan(plan);
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error creating refactoring plan: ${error}`);
    }
}

async function findCodePatterns() {
    try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        const patternType = await vscode.window.showQuickPick([
            { label: 'Design Patterns', value: 'design-patterns' },
            { label: 'Anti-patterns', value: 'anti-patterns' },
            { label: 'Code Smells', value: 'code-smells' },
            { label: 'Best Practices', value: 'best-practices' }
        ], {
            placeHolder: 'Select pattern type to find'
        });

        if (!patternType) return;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Finding ${patternType.label}...`,
            cancellable: true
        }, async (progress, token) => {
            const patterns = await codebaseAnalyzer.findCodePatterns(workspaceFolder.uri.fsPath, patternType.value as any, token);
            await showCodePatterns(patterns);
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error finding patterns: ${error}`);
    }
}

async function generateTestStrategy() {
    try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        const testType = await vscode.window.showQuickPick([
            { label: 'Unit Testing', value: 'unit' },
            { label: 'Integration Testing', value: 'integration' },
            { label: 'End-to-End Testing', value: 'e2e' },
            { label: 'Performance Testing', value: 'performance' }
        ], {
            placeHolder: 'Select test type'
        });

        if (!testType) return;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Generating ${testType.label} strategy...`,
            cancellable: true
        }, async (progress, token) => {
            const strategy = await codebaseAnalyzer.generateTestStrategy(workspaceFolder.uri.fsPath, testType.value as any, token);
            await showTestStrategy(strategy);
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error generating test strategy: ${error}`);
    }
}

async function optimizePerformance() {
    try {
        const files = await vscode.window.showOpenDialog({
            canSelectMany: true,
            canSelectFiles: true,
            canSelectFolders: false
        });

        if (!files || files.length === 0) return;

        const optimizationType = await vscode.window.showQuickPick([
            { label: 'Memory Optimization', value: 'memory' },
            { label: 'Speed Optimization', value: 'speed' },
            { label: 'Bundle Size Optimization', value: 'bundle-size' },
            { label: 'Database Optimization', value: 'database' }
        ], {
            placeHolder: 'Select optimization type'
        });

        if (!optimizationType) return;

        const filePaths = files.map(file => file.fsPath);

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Optimizing for ${optimizationType.label}...`,
            cancellable: true
        }, async (progress, token) => {
            const optimizations = await codebaseAnalyzer.optimizePerformance(filePaths, optimizationType.value as any, token);
            await showOptimizations(optimizations);
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error optimizing performance: ${error}`);
    }
}

// Helper Functions
async function selectWorkspaceFolder(): Promise<string | undefined> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        const folder = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
            openLabel: 'Select Project Folder'
        });
        return folder?.[0]?.fsPath;
    }
    
    if (workspaceFolders.length === 1) {
        return workspaceFolders[0].uri.fsPath;
    }
    
    const selected = await vscode.window.showQuickPick(
        workspaceFolders.map(folder => ({
            label: folder.name,
            description: folder.uri.fsPath,
            folder: folder
        })),
        { placeHolder: 'Select workspace folder' }
    );
    
    return selected?.folder.uri.fsPath;
}

async function showCodebaseInsights(insights: any[]) {
    const panel = vscode.window.createWebviewPanel(
        'codebaseInsights',
        'Codebase Analysis',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    panel.webview.html = getInsightsHtml(insights);
}

async function showFileAnalysis(analysis: any[]) {
    const panel = vscode.window.createWebviewPanel(
        'fileAnalysis',
        'File Analysis',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    panel.webview.html = getFileAnalysisHtml(analysis);
}

async function showRefactoringPlan(plan: any) {
    const panel = vscode.window.createWebviewPanel(
        'refactoringPlan',
        'Refactoring Plan',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    panel.webview.html = getRefactoringPlanHtml(plan);
}

async function showCodePatterns(patterns: any[]) {
    const panel = vscode.window.createWebviewPanel(
        'codePatterns',
        'Code Patterns',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    panel.webview.html = getCodePatternsHtml(patterns);
}

async function showTestStrategy(strategy: any) {
    const panel = vscode.window.createWebviewPanel(
        'testStrategy',
        'Test Strategy',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    panel.webview.html = getTestStrategyHtml(strategy);
}

async function showOptimizations(optimizations: any) {
    const panel = vscode.window.createWebviewPanel(
        'optimizations',
        'Performance Optimizations',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    panel.webview.html = getOptimizationsHtml(optimizations);
}

function getInsightsHtml(insights: any[]): string {
    const insightsHtml = insights.map(insight => `
        <div class="insight ${insight.severity}">
            <h3>${insight.title}</h3>
            <p><strong>Type:</strong> ${insight.type}</p>
            <p><strong>Description:</strong> ${insight.description}</p>
            <p><strong>Files:</strong> ${insight.files.join(', ')}</p>
            ${insight.severity ? `<p><strong>Severity:</strong> ${insight.severity}</p>` : ''}
        </div>
    `).join('');

    return getWebviewHtml('Codebase Insights', insightsHtml);
}

function getFileAnalysisHtml(analysis: any[]): string {
    const analysisHtml = analysis.map(file => `
        <div class="file-analysis">
            <h3>${file.path}</h3>
            <p><strong>Language:</strong> ${file.language}</p>
            <p><strong>Complexity:</strong> ${file.complexity}/10</p>
            <div class="issues">
                <h4>Issues:</h4>
                <ul>${file.issues.map((issue: string) => `<li>${issue}</li>`).join('')}</ul>
            </div>
            <div class="suggestions">
                <h4>Suggestions:</h4>
                <ul>${file.suggestions.map((suggestion: string) => `<li>${suggestion}</li>`).join('')}</ul>
            </div>
        </div>
    `).join('');

    return getWebviewHtml('File Analysis', analysisHtml);
}

function getRefactoringPlanHtml(plan: any): string {
    if (!plan) return getWebviewHtml('Refactoring Plan', '<p>No refactoring plan generated.</p>');

    const stepsHtml = plan.steps?.map((step: any, index: number) => `
        <div class="step">
            <h3>Step ${step.step}: ${step.title}</h3>
            <p><strong>Description:</strong> ${step.description}</p>
            <p><strong>Files:</strong> ${step.files.join(', ')}</p>
            <div class="changes">
                <h4>Changes:</h4>
                ${step.changes.map((change: any) => `
                    <div class="change">
                        <p><strong>File:</strong> ${change.file}</p>
                        <p><strong>Type:</strong> ${change.type}</p>
                        <p><strong>Description:</strong> ${change.description}</p>
                        ${change.code ? `<pre><code>${change.code}</code></pre>` : ''}
                    </div>
                `).join('')}
            </div>
            <p><strong>Testing:</strong> ${step.testing}</p>
        </div>
    `).join('') || '';

    return getWebviewHtml('Refactoring Plan', `
        <h2>${plan.goal}</h2>
        ${stepsHtml}
        <div class="summary">
            <h3>Benefits:</h3>
            <ul>${plan.benefits?.map((benefit: string) => `<li>${benefit}</li>`).join('') || ''}</ul>
            <h3>Risks:</h3>
            <ul>${plan.risks?.map((risk: string) => `<li>${risk}</li>`).join('') || ''}</ul>
            <p><strong>Estimated Time:</strong> ${plan.estimatedTime || 'Not specified'}</p>
        </div>
    `);
}

function getCodePatternsHtml(patterns: any[]): string {
    const patternsHtml = patterns.map(pattern => `
        <div class="pattern ${pattern.impact}">
            <h3>${pattern.pattern}</h3>
            <p><strong>Type:</strong> ${pattern.type}</p>
            <p><strong>Description:</strong> ${pattern.description}</p>
            <p><strong>Impact:</strong> ${pattern.impact}</p>
            <p><strong>Recommendation:</strong> ${pattern.recommendation}</p>
            <div class="locations">
                <h4>Locations:</h4>
                ${pattern.locations.map((location: any) => `
                    <div class="location">
                        <p><strong>File:</strong> ${location.file}</p>
                        <p><strong>Lines:</strong> ${location.lines}</p>
                        <pre><code>${location.code}</code></pre>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    return getWebviewHtml('Code Patterns', patternsHtml);
}

function getTestStrategyHtml(strategy: any): string {
    if (!strategy) return getWebviewHtml('Test Strategy', '<p>No test strategy generated.</p>');

    const testPlansHtml = strategy.testPlans?.map((plan: any) => `
        <div class="test-plan">
            <h4>${plan.component}</h4>
            <p><strong>Source File:</strong> ${plan.file}</p>
            <p><strong>Test File:</strong> ${plan.testFile}</p>
            <p><strong>Priority:</strong> ${plan.priority}</p>
            <div class="scenarios">
                <h5>Test Scenarios:</h5>
                <ul>${plan.scenarios.map((scenario: string) => `<li>${scenario}</li>`).join('')}</ul>
            </div>
        </div>
    `).join('') || '';

    return getWebviewHtml('Test Strategy', `
        <h2>${strategy.testType} Testing Strategy</h2>
        <p><strong>Strategy:</strong> ${strategy.strategy}</p>
        <p><strong>Framework:</strong> ${strategy.framework}</p>
        
        <div class="setup">
            <h3>Setup</h3>
            <p><strong>Dependencies:</strong> ${strategy.setup?.dependencies?.join(', ') || 'None'}</p>
            <p><strong>Configuration:</strong> ${strategy.setup?.configuration || 'Not specified'}</p>
        </div>
        
        <div class="test-plans">
            <h3>Test Plans</h3>
            ${testPlansHtml}
        </div>
        
        <div class="coverage">
            <h3>Coverage Goals</h3>
            <p><strong>Target:</strong> ${strategy.coverage?.target || 'Not specified'}</p>
            <p><strong>Critical Areas:</strong> ${strategy.coverage?.critical?.join(', ') || 'Not specified'}</p>
        </div>
    `);
}

function getOptimizationsHtml(optimizations: any): string {
    if (!optimizations) return getWebviewHtml('Performance Optimizations', '<p>No optimizations generated.</p>');

    const optimizationsHtml = optimizations.optimizations?.map((opt: any) => `
        <div class="optimization">
            <h3>${opt.title}</h3>
            <p><strong>Description:</strong> ${opt.description}</p>
            <p><strong>File:</strong> ${opt.file}</p>
            <p><strong>Expected Improvement:</strong> ${opt.expectedImprovement}</p>
            <p><strong>Effort:</strong> ${opt.effort}</p>
            
            <div class="code-comparison">
                <div class="before">
                    <h4>Before:</h4>
                    <pre><code>${opt.before}</code></pre>
                </div>
                <div class="after">
                    <h4>After:</h4>
                    <pre><code>${opt.after}</code></pre>
                </div>
            </div>
        </div>
    `).join('') || '';

    return getWebviewHtml('Performance Optimizations', `
        <h2>${optimizations.optimizationType} Optimizations</h2>
        
        <div class="current-issues">
            <h3>Current Issues</h3>
            ${optimizations.currentIssues?.map((issue: any) => `
                <div class="issue ${issue.impact}">
                    <p><strong>File:</strong> ${issue.file}</p>
                    <p><strong>Issue:</strong> ${issue.issue}</p>
                    <p><strong>Impact:</strong> ${issue.impact}</p>
                    <p><strong>Location:</strong> ${issue.location}</p>
                </div>
            `).join('') || ''}
        </div>
        
        <div class="optimizations">
            <h3>Recommended Optimizations</h3>
            ${optimizationsHtml}
        </div>
        
        <div class="tools">
            <h3>Recommended Tools</h3>
            <ul>${optimizations.tools?.map((tool: string) => `<li>${tool}</li>`).join('') || ''}</ul>
        </div>
    `);
}

function getWebviewHtml(title: string, content: string): string {
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
                h1, h2, h3, h4, h5 { color: var(--vscode-textLink-foreground); }
                .insight, .file-analysis, .step, .pattern, .test-plan, .optimization {
                    border: 1px solid var(--vscode-panel-border);
                    padding: 15px;
                    margin: 10px 0;
                    border-radius: 5px;
                }
                .insight.high { border-left: 4px solid #ff4444; }
                .insight.medium { border-left: 4px solid #ffaa00; }
                .insight.low { border-left: 4px solid #00aa00; }
                .pattern.positive { border-left: 4px solid #00aa00; }
                .pattern.negative { border-left: 4px solid #ff4444; }
                .pattern.neutral { border-left: 4px solid #888888; }
                code {
                    background-color: var(--vscode-textBlockQuote-background);
                    padding: 2px 4px;
                    border-radius: 2px;
                    font-family: var(--vscode-editor-font-family);
                }
                pre {
                    background-color: var(--vscode-textBlockQuote-background);
                    padding: 10px;
                    border-radius: 4px;
                    overflow-x: auto;
                }
                .code-comparison {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin: 10px 0;
                }
                .before, .after {
                    border: 1px solid var(--vscode-panel-border);
                    padding: 10px;
                    border-radius: 4px;
                }
                .before { border-left: 4px solid #ff4444; }
                .after { border-left: 4px solid #00aa00; }
                ul { padding-left: 20px; }
                li { margin: 5px 0; }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            ${content}
        </body>
        </html>
    `;
}

// File & Folder Management Commands
async function createSmartFile() {
    try {
        const fileName = await vscode.window.showInputBox({
            prompt: 'Enter file name (with or without extension)',
            placeHolder: 'e.g., UserService.ts, api.py, styles.css, README.md'
        });

        if (!fileName) return;

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Creating smart file: ${fileName}...`,
            cancellable: true
        }, async (progress, token) => {
            await fileSystemManager.createSmartFile(fileName, undefined, workspaceFolder.uri.fsPath, token);
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error creating smart file: ${error}`);
    }
}

async function createSmartFolder() {
    try {
        const folderName = await vscode.window.showInputBox({
            prompt: 'Enter folder name and type',
            placeHolder: 'e.g., "components" (React), "controllers" (API), "tests" (Testing)'
        });

        if (!folderName) return;

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Creating smart folder: ${folderName}...`,
            cancellable: true
        }, async (progress, token) => {
            await fileSystemManager.createSmartFolder(folderName, undefined, workspaceFolder.uri.fsPath, token);
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error creating smart folder: ${error}`);
    }
}

async function createFromTemplate() {
    try {
        const templates = fileSystemManager.getAvailableTemplates();
        const templateOptions = [];
        
        for (const [category, categoryTemplates] of Object.entries(templates)) {
            for (const template of categoryTemplates) {
                templateOptions.push({
                    label: template.name,
                    description: template.description,
                    detail: `Category: ${template.category}`,
                    template: template
                });
            }
        }

        const selectedTemplate = await vscode.window.showQuickPick(templateOptions, {
            placeHolder: 'Select a template'
        });

        if (!selectedTemplate) return;

        const fileName = await vscode.window.showInputBox({
            prompt: 'Enter file name',
            placeHolder: `e.g., MyComponent${selectedTemplate.template.extension}`
        });

        if (!fileName) return;

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        await fileSystemManager.createFileFromTemplate(
            selectedTemplate.template.name,
            fileName,
            workspaceFolder.uri.fsPath
        );
    } catch (error) {
        vscode.window.showErrorMessage(`Error creating file from template: ${error}`);
    }
}

async function createMultipleFiles() {
    try {
        const fileSpecs = await vscode.window.showInputBox({
            prompt: 'Enter file specifications (comma-separated)',
            placeHolder: 'e.g., UserService.ts, UserController.ts, user.model.ts, user.test.ts'
        });

        if (!fileSpecs) return;

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        const files = fileSpecs.split(',').map(spec => ({ name: spec.trim() }));

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Creating ${files.length} files...`,
            cancellable: true
        }, async (progress, token) => {
            await fileSystemManager.createMultipleFiles(files, workspaceFolder.uri.fsPath, token);
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error creating multiple files: ${error}`);
    }
}

// Terminal & Dependency Management Commands
async function installDependencies() {
    try {
        const dependencies = await vscode.window.showInputBox({
            prompt: 'Enter dependencies to install (space-separated)',
            placeHolder: 'e.g., express cors helmet dotenv'
        });

        if (!dependencies) return;

        const isDev = await vscode.window.showQuickPick(
            ['Production Dependencies', 'Development Dependencies'],
            { placeHolder: 'Select dependency type' }
        );

        if (!isDev) return;

        const depArray = dependencies.split(' ').filter(dep => dep.trim());
        const isDevDeps = isDev === 'Development Dependencies';

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Installing ${depArray.length} dependencies...`,
            cancellable: true
        }, async (progress, token) => {
            await terminalManager.installDependencies(depArray, isDevDeps, undefined, token);
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error installing dependencies: ${error}`);
    }
}

async function runScript() {
    try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        // Read package.json to get available scripts
        const packageJsonPath = path.join(workspaceFolder.uri.fsPath, 'package.json');
        let availableScripts: string[] = [];
        
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            availableScripts = Object.keys(packageJson.scripts || {});
        } catch (error) {
            // No package.json or no scripts
        }

        let scriptName: string | undefined;
        
        if (availableScripts.length > 0) {
            scriptName = await vscode.window.showQuickPick(availableScripts, {
                placeHolder: 'Select script to run'
            });
        } else {
            scriptName = await vscode.window.showInputBox({
                prompt: 'Enter script name to run',
                placeHolder: 'e.g., start, build, test, dev'
            });
        }

        if (!scriptName) return;

        const args = await vscode.window.showInputBox({
            prompt: 'Enter script arguments (optional)',
            placeHolder: 'e.g., --port 3000 --env development'
        });

        const argArray = args ? args.split(' ').filter(arg => arg.trim()) : [];

        await terminalManager.runScript(scriptName, argArray);
    } catch (error) {
        vscode.window.showErrorMessage(`Error running script: ${error}`);
    }
}

async function smartInstall() {
    try {
        const projectType = await vscode.window.showQuickPick([
            'React Application',
            'Node.js API',
            'Vue.js Application',
            'Angular Application',
            'Express Server',
            'Next.js Application',
            'Python Flask',
            'Python Django',
            'Spring Boot',
            'Laravel PHP'
        ], {
            placeHolder: 'Select project type for smart dependency installation'
        });

        if (!projectType) return;

        const features = await vscode.window.showQuickPick([
            'Authentication',
            'Database Integration',
            'Testing Setup',
            'Linting & Formatting',
            'Build Tools',
            'Development Tools',
            'Security Packages',
            'Performance Monitoring'
        ], {
            canPickMany: true,
            placeHolder: 'Select features to include (optional)'
        });

        const featureList = features ? features.map(f => f.toLowerCase().replace(' ', '-')) : [];

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'AI is analyzing and installing optimal dependencies...',
            cancellable: true
        }, async (progress, token) => {
            await terminalManager.smartInstall(projectType.toLowerCase().replace(' ', '-'), featureList, token);
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error in smart install: ${error}`);
    }
}

async function setupDevEnvironment() {
    try {
        const projectType = await vscode.window.showQuickPick([
            'React Development',
            'Node.js Development',
            'Python Development',
            'Java Development',
            'PHP Development',
            'Go Development',
            'Rust Development',
            'Full-Stack Development'
        ], {
            placeHolder: 'Select development environment type'
        });

        if (!projectType) return;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Setting up ${projectType} environment...`,
            cancellable: true
        }, async (progress, token) => {
            await terminalManager.setupDevelopmentEnvironment(projectType.toLowerCase().replace(' ', '-'), token);
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error setting up development environment: ${error}`);
    }
}

// Advanced Project Scaffolding Commands
async function createFullProject() {
    try {
        const description = await vscode.window.showInputBox({
            prompt: 'Describe the project you want to create',
            placeHolder: 'e.g., A React e-commerce app with user authentication, shopping cart, and payment integration'
        });

        if (!description) return;

        const projectName = await vscode.window.showInputBox({
            prompt: 'Enter project name',
            placeHolder: 'my-awesome-project'
        });

        if (!projectName) return;

        const targetFolder = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
            openLabel: 'Select Target Folder'
        });

        if (!targetFolder || targetFolder.length === 0) return;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Creating full project: ${projectName}...`,
            cancellable: true
        }, async (progress, token) => {
            await projectScaffolder.createFullProject(
                description,
                projectName,
                targetFolder[0].fsPath,
                token
            );
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error creating full project: ${error}`);
    }
}

async function createAdvancedStructure() {
    try {
        const structureType = await vscode.window.showQuickPick([
            'Clean Architecture',
            'Hexagonal Architecture',
            'Microservices Structure',
            'Domain-Driven Design',
            'MVC Pattern',
            'Repository Pattern',
            'CQRS Pattern',
            'Event-Driven Architecture'
        ], {
            placeHolder: 'Select architecture pattern'
        });

        if (!structureType) return;

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Creating ${structureType} structure...`,
            cancellable: true
        }, async (progress, token) => {
            await projectScaffolder.createAdvancedStructure(
                structureType.toLowerCase().replace(' ', '-'),
                workspaceFolder.uri.fsPath,
                {},
                token
            );
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error creating advanced structure: ${error}`);
    }
}

async function setupMicroservices() {
    try {
        const servicesInput = await vscode.window.showInputBox({
            prompt: 'Enter microservice names (comma-separated)',
            placeHolder: 'e.g., user-service, product-service, order-service, payment-service'
        });

        if (!servicesInput) return;

        const services = servicesInput.split(',').map(s => s.trim()).filter(s => s);

        if (services.length === 0) {
            vscode.window.showErrorMessage('Please enter at least one service name');
            return;
        }

        const targetFolder = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
            openLabel: 'Select Target Folder'
        });

        if (!targetFolder || targetFolder.length === 0) return;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Setting up microservices architecture...`,
            cancellable: true
        }, async (progress, token) => {
            await projectScaffolder.setupMicroserviceArchitecture(
                services,
                targetFolder[0].fsPath,
                token
            );
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error setting up microservices: ${error}`);
    }
}

async function createComponentLibrary() {
    try {
        const framework = await vscode.window.showQuickPick([
            'React',
            'Vue',
            'Angular',
            'Svelte',
            'Web Components',
            'Stencil'
        ], {
            placeHolder: 'Select framework for component library'
        });

        if (!framework) return;

        const libraryName = await vscode.window.showInputBox({
            prompt: 'Enter component library name',
            placeHolder: 'my-component-library'
        });

        if (!libraryName) return;

        const targetFolder = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
            openLabel: 'Select Target Folder'
        });

        if (!targetFolder || targetFolder.length === 0) return;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Creating ${framework} component library...`,
            cancellable: true
        }, async (progress, token) => {
            await projectScaffolder.createComponentLibrary(
                libraryName,
                framework.toLowerCase(),
                targetFolder[0].fsPath,
                token
            );
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Error creating component library: ${error}`);
    }
}

// Debugging Assistant Commands
async function analyzeError() {
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const selection = editor.selection;
        const errorText = editor.document.getText(selection);
        
        if (!errorText) {
            const errorInput = await vscode.window.showInputBox({
                prompt: 'Enter the error message to analyze',
                placeHolder: 'e.g., TypeError: Cannot read property of undefined'
            });
            
            if (!errorInput) return;
            
            const analysis = await debuggingAssistant.analyzeError(errorInput);
            await showErrorAnalysis(analysis);
        } else {
            const context = {
                file: editor.document.fileName,
                line: selection.start.line + 1,
                code: errorText
            };
            
            const analysis = await debuggingAssistant.analyzeError(errorText, undefined, context);
            await showErrorAnalysis(analysis);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error analyzing error: ${error}`);
    }
}

async function suggestBreakpoints() {
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const problemDescription = await vscode.window.showInputBox({
            prompt: 'Describe the problem you want to debug',
            placeHolder: 'e.g., Function returns undefined instead of expected value'
        });

        if (!problemDescription) return;

        const suggestions = await debuggingAssistant.suggestBreakpoints(
            editor.document.fileName,
            problemDescription
        );

        if (suggestions.length === 0) {
            vscode.window.showInformationMessage('No breakpoint suggestions found');
            return;
        }

        interface SuggestionItem extends vscode.QuickPickItem {
            suggestion: any;
        }

        const choice = await vscode.window.showQuickPick(
            suggestions.map(s => ({
                label: s.title,
                description: s.description,
                detail: `Line ${s.line} - Confidence: ${s.confidence}/10`,
                suggestion: s
            } as SuggestionItem)),
            { placeHolder: 'Select breakpoint to add' }
        );

        if (choice && choice.suggestion.action) {
            await choice.suggestion.action();
            vscode.window.showInformationMessage(`Breakpoint added at line ${choice.suggestion.line}`);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error suggesting breakpoints: ${error}`);
    }
}

async function generateDebugScript() {
    try {
        const problemDescription = await vscode.window.showInputBox({
            prompt: 'Describe the problem you want to debug',
            placeHolder: 'e.g., Memory leak in React component'
        });

        if (!problemDescription) return;

        const language = await vscode.window.showQuickPick([
            'JavaScript',
            'TypeScript',
            'Python',
            'Java',
            'C#'
        ], {
            placeHolder: 'Select programming language'
        });

        if (!language) return;

        const script = await debuggingAssistant.generateDebugScript(
            problemDescription,
            language.toLowerCase()
        );

        // Create new document with debug script
        const doc = await vscode.workspace.openTextDocument({
            content: script,
            language: language.toLowerCase()
        });

        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage('Debug script generated!');
    } catch (error) {
        vscode.window.showErrorMessage(`Error generating debug script: ${error}`);
    }
}

// Subscription & Payment Commands
async function showSubscriptionPlans() {
    try {
        await subscriptionManager.showSubscriptionPlans();
    } catch (error) {
        vscode.window.showErrorMessage(`Error showing subscription plans: ${error}`);
    }
}

async function purchaseCredits() {
    try {
        await subscriptionManager.showCreditPurchaseDialog();
    } catch (error) {
        vscode.window.showErrorMessage(`Error showing credit purchase: ${error}`);
    }
}

async function showUsageDetails() {
    try {
        const user = await subscriptionManager.getCurrentUser();
        if (!user) {
            vscode.window.showErrorMessage('User data not found');
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'usageDetails',
            'Usage Details',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        panel.webview.html = getUsageDetailsHtml(user);
    } catch (error) {
        vscode.window.showErrorMessage(`Error showing usage details: ${error}`);
    }
}

async function manageSubscription() {
    try {
        const user = await subscriptionManager.getCurrentUser();
        if (!user) {
            vscode.window.showErrorMessage('User data not found');
            return;
        }

        if (!user.subscription) {
            const choice = await vscode.window.showInformationMessage(
                'You don\'t have an active subscription. Would you like to upgrade?',
                'View Plans',
                'Cancel'
            );
            
            if (choice === 'View Plans') {
                await showSubscriptionPlans();
            }
            return;
        }

        const choice = await vscode.window.showQuickPick([
            'View Subscription Details',
            'Cancel Subscription',
            'Update Payment Method',
            'Download Invoice'
        ], {
            placeHolder: 'Manage your subscription'
        });

        switch (choice) {
            case 'Cancel Subscription':
                const confirm = await vscode.window.showWarningMessage(
                    'Are you sure you want to cancel your subscription?',
                    'Yes, Cancel',
                    'No'
                );
                
                if (confirm === 'Yes, Cancel') {
                    await subscriptionManager.cancelSubscription();
                }
                break;
                
            case 'View Subscription Details':
                await showSubscriptionDetails(user);
                break;
                
            default:
                vscode.window.showInformationMessage('Feature coming soon!');
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Error managing subscription: ${error}`);
    }
}

// Dashboard Commands
async function openDashboard() {
    try {
        await vscode.commands.executeCommand('workbench.view.extension.aiCodeGenerator');
    } catch (error) {
        vscode.window.showErrorMessage(`Error opening dashboard: ${error}`);
    }
}

async function refreshDashboard() {
    try {
        // Dashboard will auto-refresh when this command is called
        vscode.window.showInformationMessage('Dashboard refreshed!');
    } catch (error) {
        vscode.window.showErrorMessage(`Error refreshing dashboard: ${error}`);
    }
}

// Helper Functions
async function showErrorAnalysis(analysis: any) {
    const panel = vscode.window.createWebviewPanel(
        'errorAnalysis',
        'Error Analysis',
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );

    panel.webview.html = `
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
        </style>
    </head>
    <body>
        <h1>Error Analysis: ${analysis.errorType}</h1>
        
        <div class="section">
            <h2>Possible Causes</h2>
            <ul>
                ${analysis.possibleCauses.map((cause: string) => `<li>${cause}</li>`).join('')}
            </ul>
        </div>
        
        <div class="section">
            <h2>Suggested Fixes</h2>
            <ul>
                ${analysis.suggestedFixes.map((fix: string) => `<li>${fix}</li>`).join('')}
            </ul>
        </div>
        
        <div class="section">
            <h2>Debugging Steps</h2>
            <ol>
                ${analysis.debuggingSteps.map((step: string) => `<li>${step}</li>`).join('')}
            </ol>
        </div>
        
        <div class="section">
            <h2>Prevention Tips</h2>
            <ul>
                ${analysis.preventionTips.map((tip: string) => `<li>${tip}</li>`).join('')}
            </ul>
        </div>
    </body>
    </html>
    `;
}

function getUsageDetailsHtml(user: any): string {
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
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin: 20px 0;
            }
            .stat-card {
                background: var(--vscode-textBlockQuote-background);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 8px;
                padding: 20px;
                text-align: center;
            }
            .stat-number {
                font-size: 32px;
                font-weight: bold;
                color: var(--vscode-textLink-foreground);
                margin-bottom: 5px;
            }
            .stat-label {
                font-size: 14px;
                opacity: 0.8;
            }
            .progress-bar {
                width: 100%;
                height: 8px;
                background: var(--vscode-panel-border);
                border-radius: 4px;
                overflow: hidden;
                margin: 10px 0;
            }
            .progress-fill {
                height: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                transition: width 0.3s ease;
            }
        </style>
    </head>
    <body>
        <h1>Usage Details</h1>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${user.credits}</div>
                <div class="stat-label">Available Credits</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${user.usage.today}</div>
                <div class="stat-label">Used Today</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${user.usage.thisMonth}</div>
                <div class="stat-label">Used This Month</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${user.usage.total}</div>
                <div class="stat-label">Total Usage</div>
            </div>
        </div>
        
        <h2>Feature Usage</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${user.usage.codeGeneration}</div>
                <div class="stat-label">Code Generation</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${user.usage.scanning}</div>
                <div class="stat-label">Project Scanning</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${user.usage.projectCreation}</div>
                <div class="stat-label">Project Creation</div>
            </div>
        </div>
        
        <h2>Statistics</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${user.stats.filesGenerated}</div>
                <div class="stat-label">Files Generated</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${user.stats.bugsFixed}</div>
                <div class="stat-label">Bugs Fixed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${user.stats.timesSaved}</div>
                <div class="stat-label">Time Saved</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${user.stats.projectsCreated}</div>
                <div class="stat-label">Projects Created</div>
            </div>
        </div>
    </body>
    </html>
    `;
}

async function showSubscriptionDetails(user: any) {
    const panel = vscode.window.createWebviewPanel(
        'subscriptionDetails',
        'Subscription Details',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    panel.webview.html = `
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
            .detail-card {
                background: var(--vscode-textBlockQuote-background);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 8px;
                padding: 20px;
                margin: 15px 0;
            }
            .detail-row {
                display: flex;
                justify-content: space-between;
                margin: 10px 0;
                padding: 8px 0;
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            .detail-label {
                font-weight: bold;
            }
            .status-active {
                color: #66bb6a;
                font-weight: bold;
            }
            .status-cancelled {
                color: #ff6b6b;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <h1>Subscription Details</h1>
        
        <div class="detail-card">
            <h2>Current Plan</h2>
            <div class="detail-row">
                <span class="detail-label">Plan:</span>
                <span>${user.plan}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="${user.subscription?.status === 'active' ? 'status-active' : 'status-cancelled'}">
                    ${user.subscription?.status || 'No subscription'}
                </span>
            </div>
            ${user.subscription ? `
            <div class="detail-row">
                <span class="detail-label">Next Billing:</span>
                <span>${new Date(user.subscription.currentPeriodEnd).toLocaleDateString()}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Auto Renew:</span>
                <span>${user.subscription.autoRenew ? 'Yes' : 'No'}</span>
            </div>
            ` : ''}
        </div>
        
        <div class="detail-card">
            <h2>Account Information</h2>
            <div class="detail-row">
                <span class="detail-label">Name:</span>
                <span>${user.name}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Email:</span>
                <span>${user.email}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Credits:</span>
                <span>${user.credits}</span>
            </div>
        </div>
    </body>
    </html>
    `;
}

export function deactivate() {
    intelligentCompletion?.dispose();
    terminalManager?.dispose();
    enhancedAutocomplete?.dispose();
    debuggingAssistant?.dispose();
}