import * as vscode from 'vscode';
import { AIProvider } from '../aiProvider';
import { AdvancedScanner, ScanResult, ProjectHealth } from '../advancedScanner';
import { SubscriptionManager } from '../subscription/subscriptionManager';

export interface DashboardData {
    user: {
        name: string;
        email: string;
        plan: string;
        credits: number;
        usage: {
            today: number;
            thisMonth: number;
            total: number;
        };
    };
    project: {
        name: string;
        health: ProjectHealth;
        recentScans: ScanResult[];
        suggestions: string[];
    };
    features: {
        available: string[];
        premium: string[];
        usage: { [feature: string]: number };
    };
    stats: {
        filesGenerated: number;
        bugsFixed: number;
        timesSaved: string;
        projectsCreated: number;
    };
}

export class DashboardProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'aiCodeGenerator.dashboard';
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly aiProvider: AIProvider,
        private readonly scanner: AdvancedScanner,
        private readonly subscriptionManager: SubscriptionManager
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'refresh':
                    await this.refreshDashboard();
                    break;
                case 'scanProject':
                    await this.scanCurrentProject();
                    break;
                case 'openFeature':
                    await this.openFeature(data.feature);
                    break;
                case 'upgrade':
                    await this.openUpgradeDialog();
                    break;
                case 'openSettings':
                    await this.openSettings();
                    break;
                case 'viewUsage':
                    await this.viewUsageDetails();
                    break;
                case 'quickAction':
                    await this.executeQuickAction(data.action);
                    break;
            }
        });

        // Initial load
        this.refreshDashboard();
    }

    private async refreshDashboard() {
        if (!this._view) return;

        const dashboardData = await this.getDashboardData();
        
        this._view.webview.postMessage({
            type: 'updateDashboard',
            data: dashboardData
        });
    }

    private async getDashboardData(): Promise<DashboardData> {
        const user = await this.subscriptionManager.getCurrentUser();
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        
        let projectHealth: ProjectHealth = {
            score: 0,
            totalIssues: 0,
            criticalIssues: 0,
            securityIssues: 0,
            performanceIssues: 0,
            maintainabilityScore: 0,
            testCoverage: 0,
            codeQuality: 0,
            recommendations: []
        };

        let recentScans: ScanResult[] = [];

        if (workspaceFolder) {
            recentScans = this.scanner.getScanResults(workspaceFolder.uri.fsPath);
            
            if (recentScans.length > 0) {
                projectHealth = {
                    score: Math.max(0, 100 - recentScans.length * 2),
                    totalIssues: recentScans.length,
                    criticalIssues: recentScans.filter(r => r.severity === 'critical').length,
                    securityIssues: recentScans.filter(r => r.category === 'security').length,
                    performanceIssues: recentScans.filter(r => r.category === 'performance').length,
                    maintainabilityScore: Math.max(0, 100 - recentScans.filter(r => r.category === 'maintainability').length * 5),
                    testCoverage: 70, // This would be calculated from actual test analysis
                    codeQuality: Math.max(0, 100 - recentScans.filter(r => r.category === 'style').length * 3),
                    recommendations: [
                        'Run a full project scan',
                        'Fix critical security issues',
                        'Add unit tests',
                        'Optimize performance bottlenecks'
                    ]
                };
            }
        }

        return {
            user: {
                name: user?.name || 'Developer',
                email: user?.email || 'user@example.com',
                plan: user?.plan || 'Free',
                credits: user?.credits || 100,
                usage: {
                    today: user?.usage?.today || 0,
                    thisMonth: user?.usage?.thisMonth || 0,
                    total: user?.usage?.total || 0
                }
            },
            project: {
                name: workspaceFolder?.name || 'No Project',
                health: projectHealth,
                recentScans: recentScans.slice(0, 5),
                suggestions: projectHealth.recommendations
            },
            features: {
                available: [
                    'Smart File Creation',
                    'Code Generation',
                    'Basic Scanning',
                    'AI Chat'
                ],
                premium: [
                    'Advanced Project Scanning',
                    'Performance Optimization',
                    'Security Analysis',
                    'Microservices Setup',
                    'Component Libraries',
                    'Priority Support'
                ],
                usage: {
                    'codeGeneration': user?.usage?.codeGeneration || 0,
                    'scanning': user?.usage?.scanning || 0,
                    'projectCreation': user?.usage?.projectCreation || 0
                }
            },
            stats: {
                filesGenerated: user?.stats?.filesGenerated || 0,
                bugsFixed: user?.stats?.bugsFixed || 0,
                timesSaved: user?.stats?.timesSaved || '0 hours',
                projectsCreated: user?.stats?.projectsCreated || 0
            }
        };
    }

    private async scanCurrentProject() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Scanning project...',
            cancellable: true
        }, async (progress, token) => {
            try {
                await this.scanner.scanFullProject(
                    workspaceFolder.uri.fsPath,
                    {},
                    (scanProgress) => {
                        progress.report({
                            message: scanProgress.phase,
                            increment: scanProgress.progress
                        });
                    },
                    token
                );

                await this.refreshDashboard();
                vscode.window.showInformationMessage('Project scan completed!');
            } catch (error) {
                vscode.window.showErrorMessage(`Scan failed: ${error}`);
            }
        });
    }

    private async openFeature(feature: string) {
        const commands: { [key: string]: string } = {
            'smartFile': 'aiCodeGenerator.createSmartFile',
            'smartFolder': 'aiCodeGenerator.createSmartFolder',
            'generateCode': 'aiCodeGenerator.generateCode',
            'scanProject': 'aiCodeGenerator.analyzeCodebase',
            'createProject': 'aiCodeGenerator.createFullProject',
            'installDeps': 'aiCodeGenerator.smartInstall',
            'chat': 'aiCodeGenerator.openChat'
        };

        const command = commands[feature];
        if (command) {
            await vscode.commands.executeCommand(command);
        }
    }

    private async openUpgradeDialog() {
        const choice = await vscode.window.showInformationMessage(
            'Upgrade to Premium for unlimited access to all features!',
            'View Plans',
            'Maybe Later'
        );

        if (choice === 'View Plans') {
            await vscode.commands.executeCommand('aiCodeGenerator.showSubscriptionPlans');
        }
    }

    private async openSettings() {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'aiCodeGenerator');
    }

    private async viewUsageDetails() {
        await vscode.commands.executeCommand('aiCodeGenerator.showUsageDetails');
    }

    private async executeQuickAction(action: string) {
        switch (action) {
            case 'createFile':
                await vscode.commands.executeCommand('aiCodeGenerator.createSmartFile');
                break;
            case 'generateCode':
                await vscode.commands.executeCommand('aiCodeGenerator.generateCode');
                break;
            case 'scanSecurity':
                await vscode.commands.executeCommand('aiCodeGenerator.analyzeFiles');
                break;
            case 'optimizePerformance':
                await vscode.commands.executeCommand('aiCodeGenerator.optimizePerformance');
                break;
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'dashboard.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'dashboard.js'));

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Code Generator Dashboard</title>
    <link href="${styleUri}" rel="stylesheet">
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 0;
            overflow-x: hidden;
        }

        .dashboard {
            padding: 20px;
            max-width: 100%;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .logo-icon {
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 16px;
        }

        .user-info {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .credits {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            padding: 5px 12px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: bold;
        }

        .plan-badge {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: var(--vscode-textBlockQuote-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            transition: transform 0.2s ease;
        }

        .stat-card:hover {
            transform: translateY(-2px);
            border-color: var(--vscode-textLink-foreground);
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

        .project-health {
            background: var(--vscode-textBlockQuote-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 30px;
        }

        .health-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .health-score {
            font-size: 48px;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
        }

        .health-metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }

        .metric {
            text-align: center;
        }

        .metric-value {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .metric-label {
            font-size: 12px;
            opacity: 0.7;
        }

        .critical { color: #ff6b6b; }
        .warning { color: #ffa726; }
        .good { color: #66bb6a; }

        .quick-actions {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }

        .action-card {
            background: var(--vscode-textBlockQuote-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 12px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.2s ease;
            text-align: center;
        }

        .action-card:hover {
            transform: translateY(-2px);
            border-color: var(--vscode-textLink-foreground);
            background: var(--vscode-button-hoverBackground);
        }

        .action-icon {
            font-size: 32px;
            margin-bottom: 10px;
        }

        .action-title {
            font-weight: bold;
            margin-bottom: 5px;
        }

        .action-description {
            font-size: 12px;
            opacity: 0.7;
        }

        .recent-activity {
            background: var(--vscode-textBlockQuote-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 12px;
            padding: 25px;
        }

        .activity-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .activity-item:last-child {
            border-bottom: none;
        }

        .activity-icon {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            margin-right: 10px;
        }

        .btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            transition: background-color 0.2s ease;
        }

        .btn:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .btn-secondary {
            background: transparent;
            border: 1px solid var(--vscode-panel-border);
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

        .recommendations {
            margin-top: 20px;
        }

        .recommendation {
            background: var(--vscode-inputValidation-infoBackground);
            border-left: 4px solid var(--vscode-textLink-foreground);
            padding: 10px 15px;
            margin: 10px 0;
            border-radius: 0 6px 6px 0;
        }

        .loading {
            text-align: center;
            padding: 40px;
            opacity: 0.7;
        }

        .spinner {
            border: 2px solid var(--vscode-panel-border);
            border-top: 2px solid var(--vscode-textLink-foreground);
            border-radius: 50%;
            width: 24px;
            height: 24px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }

        .feature-card {
            background: var(--vscode-textBlockQuote-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 15px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .feature-card:hover {
            border-color: var(--vscode-textLink-foreground);
        }

        .feature-card.premium {
            border-color: #ffa726;
            position: relative;
        }

        .feature-card.premium::after {
            content: "PRO";
            position: absolute;
            top: -8px;
            right: -8px;
            background: #ffa726;
            color: white;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 10px;
            font-weight: bold;
        }

        .section-title {
            font-size: 18px;
            font-weight: bold;
            margin: 30px 0 15px 0;
            color: var(--vscode-textLink-foreground);
        }

        .upgrade-banner {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            margin: 20px 0;
        }

        .upgrade-banner h3 {
            margin: 0 0 10px 0;
        }

        .upgrade-banner p {
            margin: 0 0 15px 0;
            opacity: 0.9;
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="loading" id="loading">
            <div class="spinner"></div>
            <div>Loading dashboard...</div>
        </div>

        <div id="dashboard-content" style="display: none;">
            <!-- Header -->
            <div class="header">
                <div class="logo">
                    <div class="logo-icon">AI</div>
                    <div>
                        <h2 style="margin: 0;">AI Code Generator</h2>
                        <p style="margin: 0; opacity: 0.7; font-size: 12px;">Your AI Development Assistant</p>
                    </div>
                </div>
                <div class="user-info">
                    <div class="credits" id="credits">100 Credits</div>
                    <div class="plan-badge" id="plan">Free</div>
                    <button class="btn btn-secondary" onclick="openSettings()">⚙️</button>
                </div>
            </div>

            <!-- Stats Grid -->
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number" id="filesGenerated">0</div>
                    <div class="stat-label">Files Generated</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="bugsFixed">0</div>
                    <div class="stat-label">Bugs Fixed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="timesSaved">0h</div>
                    <div class="stat-label">Time Saved</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="projectsCreated">0</div>
                    <div class="stat-label">Projects Created</div>
                </div>
            </div>

            <!-- Project Health -->
            <div class="project-health">
                <div class="health-header">
                    <div>
                        <h3 style="margin: 0;">Project Health</h3>
                        <p style="margin: 5px 0 0 0; opacity: 0.7;" id="projectName">No Project</p>
                    </div>
                    <div class="health-score" id="healthScore">0</div>
                </div>
                
                <div class="health-metrics">
                    <div class="metric">
                        <div class="metric-value critical" id="criticalIssues">0</div>
                        <div class="metric-label">Critical Issues</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value warning" id="securityIssues">0</div>
                        <div class="metric-label">Security Issues</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value good" id="testCoverage">0%</div>
                        <div class="metric-label">Test Coverage</div>
                    </div>
                    <div class="metric">
                        <div class="metric-value good" id="codeQuality">0</div>
                        <div class="metric-label">Code Quality</div>
                    </div>
                </div>

                <button class="btn btn-primary" onclick="scanProject()">🔍 Scan Project</button>
                <button class="btn btn-secondary" onclick="viewUsage()">📊 View Details</button>

                <div class="recommendations" id="recommendations"></div>
            </div>

            <!-- Quick Actions -->
            <div class="section-title">Quick Actions</div>
            <div class="quick-actions">
                <div class="action-card" onclick="quickAction('createFile')">
                    <div class="action-icon">📄</div>
                    <div class="action-title">Create Smart File</div>
                    <div class="action-description">Generate files with AI content</div>
                </div>
                <div class="action-card" onclick="quickAction('generateCode')">
                    <div class="action-icon">⚡</div>
                    <div class="action-title">Generate Code</div>
                    <div class="action-description">Create code from descriptions</div>
                </div>
                <div class="action-card" onclick="quickAction('scanSecurity')">
                    <div class="action-icon">🔒</div>
                    <div class="action-title">Security Scan</div>
                    <div class="action-description">Find security vulnerabilities</div>
                </div>
                <div class="action-card" onclick="quickAction('optimizePerformance')">
                    <div class="action-icon">🚀</div>
                    <div class="action-title">Optimize Performance</div>
                    <div class="action-description">Improve code performance</div>
                </div>
            </div>

            <!-- Features -->
            <div class="section-title">Available Features</div>
            <div class="feature-grid" id="features"></div>

            <!-- Upgrade Banner -->
            <div class="upgrade-banner" id="upgradeBanner" style="display: none;">
                <h3>🚀 Upgrade to Premium</h3>
                <p>Unlock advanced features, unlimited scans, and priority support</p>
                <button class="btn" style="background: white; color: #667eea;" onclick="upgrade()">View Plans</button>
            </div>

            <!-- Recent Activity -->
            <div class="section-title">Recent Activity</div>
            <div class="recent-activity" id="recentActivity">
                <div class="activity-item">
                    <div style="display: flex; align-items: center;">
                        <div class="activity-icon" style="background: #66bb6a; color: white;">✓</div>
                        <div>Welcome to AI Code Generator!</div>
                    </div>
                    <div style="font-size: 12px; opacity: 0.7;">Just now</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let dashboardData = null;

        // Event listeners
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'updateDashboard':
                    updateDashboard(message.data);
                    break;
            }
        });

        function updateDashboard(data) {
            dashboardData = data;
            
            // Hide loading, show content
            document.getElementById('loading').style.display = 'none';
            document.getElementById('dashboard-content').style.display = 'block';

            // Update user info
            document.getElementById('credits').textContent = \`\${data.user.credits} Credits\`;
            document.getElementById('plan').textContent = data.user.plan;

            // Update stats
            document.getElementById('filesGenerated').textContent = data.stats.filesGenerated;
            document.getElementById('bugsFixed').textContent = data.stats.bugsFixed;
            document.getElementById('timesSaved').textContent = data.stats.timesSaved;
            document.getElementById('projectsCreated').textContent = data.stats.projectsCreated;

            // Update project health
            document.getElementById('projectName').textContent = data.project.name;
            document.getElementById('healthScore').textContent = data.project.health.score;
            document.getElementById('criticalIssues').textContent = data.project.health.criticalIssues;
            document.getElementById('securityIssues').textContent = data.project.health.securityIssues;
            document.getElementById('testCoverage').textContent = \`\${data.project.health.testCoverage}%\`;
            document.getElementById('codeQuality').textContent = data.project.health.codeQuality;

            // Update recommendations
            const recommendationsEl = document.getElementById('recommendations');
            recommendationsEl.innerHTML = '';
            data.project.suggestions.forEach(suggestion => {
                const div = document.createElement('div');
                div.className = 'recommendation';
                div.textContent = suggestion;
                recommendationsEl.appendChild(div);
            });

            // Update features
            updateFeatures(data.features);

            // Show upgrade banner for free users
            if (data.user.plan === 'Free') {
                document.getElementById('upgradeBanner').style.display = 'block';
            }
        }

        function updateFeatures(features) {
            const featuresEl = document.getElementById('features');
            featuresEl.innerHTML = '';

            // Available features
            features.available.forEach(feature => {
                const div = document.createElement('div');
                div.className = 'feature-card';
                div.innerHTML = \`
                    <div style="font-weight: bold; margin-bottom: 5px;">\${feature}</div>
                    <div style="font-size: 12px; opacity: 0.7;">Available</div>
                \`;
                div.onclick = () => openFeature(feature.toLowerCase().replace(' ', ''));
                featuresEl.appendChild(div);
            });

            // Premium features
            features.premium.forEach(feature => {
                const div = document.createElement('div');
                div.className = 'feature-card premium';
                div.innerHTML = \`
                    <div style="font-weight: bold; margin-bottom: 5px;">\${feature}</div>
                    <div style="font-size: 12px; opacity: 0.7;">Premium Only</div>
                \`;
                div.onclick = () => upgrade();
                featuresEl.appendChild(div);
            });
        }

        // Action functions
        function refresh() {
            vscode.postMessage({ type: 'refresh' });
        }

        function scanProject() {
            vscode.postMessage({ type: 'scanProject' });
        }

        function openFeature(feature) {
            vscode.postMessage({ type: 'openFeature', feature });
        }

        function upgrade() {
            vscode.postMessage({ type: 'upgrade' });
        }

        function openSettings() {
            vscode.postMessage({ type: 'openSettings' });
        }

        function viewUsage() {
            vscode.postMessage({ type: 'viewUsage' });
        }

        function quickAction(action) {
            vscode.postMessage({ type: 'quickAction', action });
        }

        // Initialize
        vscode.postMessage({ type: 'refresh' });
    </script>
</body>
</html>`;
    }
}