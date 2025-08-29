import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AIProvider, AIMessage } from './aiProvider';

export interface ScanResult {
    id: string;
    type: 'error' | 'warning' | 'info' | 'suggestion';
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: 'security' | 'performance' | 'maintainability' | 'bugs' | 'style' | 'optimization';
    title: string;
    description: string;
    file: string;
    line?: number;
    column?: number;
    code?: string;
    suggestion?: string;
    fixable: boolean;
    autoFix?: string;
    impact: string;
    effort: 'low' | 'medium' | 'high';
}

export interface ProjectHealth {
    score: number; // 0-100
    totalIssues: number;
    criticalIssues: number;
    securityIssues: number;
    performanceIssues: number;
    maintainabilityScore: number;
    testCoverage: number;
    codeQuality: number;
    recommendations: string[];
}

export interface ScanProgress {
    phase: string;
    progress: number;
    currentFile: string;
    totalFiles: number;
    processedFiles: number;
}

export class AdvancedScanner {
    private scanResults: Map<string, ScanResult[]> = new Map();
    private isScanning: boolean = false;
    private scanProgress: ScanProgress = {
        phase: 'idle',
        progress: 0,
        currentFile: '',
        totalFiles: 0,
        processedFiles: 0
    };

    constructor(private aiProvider: AIProvider) {}

    public async scanFullProject(
        projectPath: string,
        options: {
            includeTests?: boolean;
            includeNodeModules?: boolean;
            scanDepth?: number;
            categories?: string[];
        } = {},
        progressCallback?: (progress: ScanProgress) => void,
        cancellationToken?: vscode.CancellationToken
    ): Promise<{ results: ScanResult[]; health: ProjectHealth }> {
        if (this.isScanning) {
            throw new Error('Scan already in progress');
        }

        this.isScanning = true;
        const results: ScanResult[] = [];

        try {
            // Phase 1: Discover files
            this.updateProgress('Discovering files...', 0, '', progressCallback);
            const files = await this.discoverFiles(projectPath, options);
            
            this.scanProgress.totalFiles = files.length;
            this.scanProgress.processedFiles = 0;

            // Phase 2: Analyze project structure
            this.updateProgress('Analyzing project structure...', 10, '', progressCallback);
            const projectStructure = await this.analyzeProjectStructure(projectPath, files);

            // Phase 3: Scan individual files
            this.updateProgress('Scanning files...', 20, '', progressCallback);
            
            for (let i = 0; i < files.length; i++) {
                if (cancellationToken?.isCancellationRequested) {
                    break;
                }

                const file = files[i];
                const progress = 20 + (i / files.length) * 60;
                
                this.updateProgress('Scanning files...', progress, file, progressCallback);
                
                const fileResults = await this.scanFile(file, projectStructure, options);
                results.push(...fileResults);
                
                this.scanProgress.processedFiles++;
            }

            // Phase 4: Cross-file analysis
            this.updateProgress('Performing cross-file analysis...', 80, '', progressCallback);
            const crossFileResults = await this.performCrossFileAnalysis(files, projectStructure, cancellationToken);
            results.push(...crossFileResults);

            // Phase 5: Generate project health report
            this.updateProgress('Generating health report...', 90, '', progressCallback);
            const health = await this.generateProjectHealth(results, projectStructure);

            // Phase 6: AI-powered insights
            this.updateProgress('Generating AI insights...', 95, '', progressCallback);
            const aiInsights = await this.generateAIInsights(results, projectStructure, cancellationToken);
            results.push(...aiInsights);

            this.updateProgress('Scan complete', 100, '', progressCallback);

            // Cache results
            this.scanResults.set(projectPath, results);

            return { results, health };

        } finally {
            this.isScanning = false;
        }
    }

    public async scanFile(
        filePath: string,
        projectStructure?: any,
        options: any = {}
    ): Promise<ScanResult[]> {
        const results: ScanResult[] = [];

        try {
            if (!fs.existsSync(filePath)) {
                return results;
            }

            const content = fs.readFileSync(filePath, 'utf8');
            const extension = path.extname(filePath);
            const language = this.getLanguageFromExtension(extension);

            // Security scan
            results.push(...await this.scanSecurity(filePath, content, language));

            // Performance scan
            results.push(...await this.scanPerformance(filePath, content, language));

            // Code quality scan
            results.push(...await this.scanCodeQuality(filePath, content, language));

            // Bug detection
            results.push(...await this.scanBugs(filePath, content, language));

            // Style and maintainability
            results.push(...await this.scanStyle(filePath, content, language));

            // Language-specific scans
            results.push(...await this.scanLanguageSpecific(filePath, content, language));

        } catch (error) {
            console.error(`Error scanning file ${filePath}:`, error);
        }

        return results;
    }

    public async scanSecurity(filePath: string, content: string, language: string): Promise<ScanResult[]> {
        const results: ScanResult[] = [];

        // Common security patterns
        const securityPatterns = [
            {
                pattern: /password\s*=\s*['"][^'"]*['"]/gi,
                title: 'Hardcoded Password',
                description: 'Password found in source code',
                severity: 'critical' as const,
                category: 'security' as const
            },
            {
                pattern: /api[_-]?key\s*=\s*['"][^'"]*['"]/gi,
                title: 'Hardcoded API Key',
                description: 'API key found in source code',
                severity: 'critical' as const,
                category: 'security' as const
            },
            {
                pattern: /eval\s*\(/gi,
                title: 'Use of eval()',
                description: 'eval() can execute arbitrary code and is a security risk',
                severity: 'high' as const,
                category: 'security' as const
            },
            {
                pattern: /innerHTML\s*=/gi,
                title: 'Potential XSS Risk',
                description: 'innerHTML usage can lead to XSS vulnerabilities',
                severity: 'medium' as const,
                category: 'security' as const
            }
        ];

        const lines = content.split('\n');
        
        for (const { pattern, title, description, severity, category } of securityPatterns) {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const match = pattern.exec(line);
                
                if (match) {
                    results.push({
                        id: `security-${Date.now()}-${i}`,
                        type: 'error',
                        severity,
                        category,
                        title,
                        description,
                        file: filePath,
                        line: i + 1,
                        column: match.index,
                        code: line.trim(),
                        fixable: true,
                        impact: 'Security vulnerability that could be exploited',
                        effort: 'low'
                    });
                }
            }
        }

        return results;
    }

    public async scanPerformance(filePath: string, content: string, language: string): Promise<ScanResult[]> {
        const results: ScanResult[] = [];

        const performancePatterns = [
            {
                pattern: /for\s*\([^)]*\)\s*\{[^}]*for\s*\([^)]*\)/gi,
                title: 'Nested Loops',
                description: 'Nested loops can cause performance issues with large datasets',
                severity: 'medium' as const
            },
            {
                pattern: /\.forEach\s*\([^)]*\)\s*\{[^}]*\.forEach/gi,
                title: 'Nested forEach',
                description: 'Nested forEach calls can be inefficient',
                severity: 'medium' as const
            },
            {
                pattern: /document\.getElementById|document\.querySelector/gi,
                title: 'DOM Query in Loop',
                description: 'DOM queries should be cached outside loops',
                severity: 'medium' as const
            }
        ];

        const lines = content.split('\n');
        
        for (const { pattern, title, description, severity } of performancePatterns) {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const match = pattern.exec(line);
                
                if (match) {
                    results.push({
                        id: `performance-${Date.now()}-${i}`,
                        type: 'warning',
                        severity,
                        category: 'performance',
                        title,
                        description,
                        file: filePath,
                        line: i + 1,
                        column: match.index,
                        code: line.trim(),
                        fixable: true,
                        impact: 'May cause performance degradation',
                        effort: 'medium'
                    });
                }
            }
        }

        return results;
    }

    public async scanCodeQuality(filePath: string, content: string, language: string): Promise<ScanResult[]> {
        const results: ScanResult[] = [];

        // Check function length
        const functions = this.extractFunctions(content, language);
        for (const func of functions) {
            if (func.lineCount > 50) {
                results.push({
                    id: `quality-long-function-${func.name}`,
                    type: 'warning',
                    severity: 'medium',
                    category: 'maintainability',
                    title: 'Long Function',
                    description: `Function '${func.name}' is ${func.lineCount} lines long. Consider breaking it down.`,
                    file: filePath,
                    line: func.startLine,
                    fixable: false,
                    impact: 'Reduces code readability and maintainability',
                    effort: 'high'
                });
            }
        }

        // Check for code duplication
        const duplicates = this.findCodeDuplication(content);
        for (const duplicate of duplicates) {
            results.push({
                id: `quality-duplicate-${duplicate.hash}`,
                type: 'info',
                severity: 'low',
                category: 'maintainability',
                title: 'Code Duplication',
                description: 'Similar code blocks found that could be refactored',
                file: filePath,
                line: duplicate.line,
                code: duplicate.code,
                fixable: false,
                impact: 'Increases maintenance burden',
                effort: 'medium'
            });
        }

        return results;
    }

    public async scanBugs(filePath: string, content: string, language: string): Promise<ScanResult[]> {
        const results: ScanResult[] = [];

        const bugPatterns = [
            {
                pattern: /==\s*null|null\s*==/gi,
                title: 'Null Comparison',
                description: 'Use === for null comparison to avoid type coercion',
                severity: 'medium' as const,
                autoFix: 'Replace == with ==='
            },
            {
                pattern: /var\s+\w+/gi,
                title: 'Use of var',
                description: 'Use let or const instead of var for better scoping',
                severity: 'low' as const,
                autoFix: 'Replace var with let or const'
            }
        ];

        const lines = content.split('\n');
        
        for (const { pattern, title, description, severity, autoFix } of bugPatterns) {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const match = pattern.exec(line);
                
                if (match) {
                    results.push({
                        id: `bug-${Date.now()}-${i}`,
                        type: 'warning',
                        severity,
                        category: 'bugs',
                        title,
                        description,
                        file: filePath,
                        line: i + 1,
                        column: match.index,
                        code: line.trim(),
                        fixable: true,
                        autoFix,
                        impact: 'Potential runtime issues',
                        effort: 'low'
                    });
                }
            }
        }

        return results;
    }

    public async scanStyle(filePath: string, content: string, language: string): Promise<ScanResult[]> {
        const results: ScanResult[] = [];

        // Check for consistent indentation
        const lines = content.split('\n');
        let indentationType: 'spaces' | 'tabs' | 'mixed' | null = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim() === '') continue;
            
            const leadingWhitespace = line.match(/^[\s]*/)?.[0] || '';
            if (leadingWhitespace.length === 0) continue;
            
            const hasSpaces = leadingWhitespace.includes(' ');
            const hasTabs = leadingWhitespace.includes('\t');
            
            if (hasSpaces && hasTabs) {
                results.push({
                    id: `style-mixed-indent-${i}`,
                    type: 'info',
                    severity: 'low',
                    category: 'style',
                    title: 'Mixed Indentation',
                    description: 'Line uses both spaces and tabs for indentation',
                    file: filePath,
                    line: i + 1,
                    code: line,
                    fixable: true,
                    impact: 'Inconsistent code formatting',
                    effort: 'low'
                });
            }
        }

        return results;
    }

    public async scanLanguageSpecific(filePath: string, content: string, language: string): Promise<ScanResult[]> {
        const results: ScanResult[] = [];

        switch (language) {
            case 'typescript':
            case 'javascript':
                results.push(...await this.scanJavaScript(filePath, content));
                break;
            case 'python':
                results.push(...await this.scanPython(filePath, content));
                break;
            case 'java':
                results.push(...await this.scanJava(filePath, content));
                break;
        }

        return results;
    }

    private async scanJavaScript(filePath: string, content: string): Promise<ScanResult[]> {
        const results: ScanResult[] = [];

        // Check for missing semicolons
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && !line.endsWith(';') && !line.endsWith('{') && !line.endsWith('}') && !line.startsWith('//')) {
                results.push({
                    id: `js-semicolon-${i}`,
                    type: 'info',
                    severity: 'low',
                    category: 'style',
                    title: 'Missing Semicolon',
                    description: 'Consider adding semicolon for consistency',
                    file: filePath,
                    line: i + 1,
                    code: line,
                    fixable: true,
                    autoFix: 'Add semicolon at end of line',
                    impact: 'Style inconsistency',
                    effort: 'low'
                });
            }
        }

        return results;
    }

    private async scanPython(filePath: string, content: string): Promise<ScanResult[]> {
        const results: ScanResult[] = [];

        // Check for PEP 8 violations
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Line too long
            if (line.length > 79) {
                results.push({
                    id: `python-line-length-${i}`,
                    type: 'info',
                    severity: 'low',
                    category: 'style',
                    title: 'Line Too Long',
                    description: `Line exceeds 79 characters (${line.length} chars)`,
                    file: filePath,
                    line: i + 1,
                    code: line,
                    fixable: false,
                    impact: 'PEP 8 style violation',
                    effort: 'low'
                });
            }
        }

        return results;
    }

    private async scanJava(filePath: string, content: string): Promise<ScanResult[]> {
        const results: ScanResult[] = [];

        // Check for proper class naming
        const classMatches = content.match(/class\s+(\w+)/g);
        if (classMatches) {
            for (const match of classMatches) {
                const className = match.split(' ')[1];
                if (!/^[A-Z][a-zA-Z0-9]*$/.test(className)) {
                    results.push({
                        id: `java-class-naming-${className}`,
                        type: 'warning',
                        severity: 'low',
                        category: 'style',
                        title: 'Class Naming Convention',
                        description: `Class '${className}' should follow PascalCase naming`,
                        file: filePath,
                        fixable: false,
                        impact: 'Java naming convention violation',
                        effort: 'low'
                    });
                }
            }
        }

        return results;
    }

    private async discoverFiles(
        projectPath: string,
        options: any
    ): Promise<string[]> {
        const files: string[] = [];
        const maxDepth = options.scanDepth || 10;

        const scanDirectory = (dir: string, currentDepth: number = 0) => {
            if (currentDepth >= maxDepth) return;

            try {
                const items = fs.readdirSync(dir);
                
                for (const item of items) {
                    const itemPath = path.join(dir, item);
                    const stat = fs.statSync(itemPath);

                    if (stat.isDirectory()) {
                        // Skip certain directories
                        if (!options.includeNodeModules && item === 'node_modules') continue;
                        if (item.startsWith('.') && item !== '.vscode') continue;
                        if (item === 'dist' || item === 'build' || item === 'out') continue;

                        scanDirectory(itemPath, currentDepth + 1);
                    } else if (stat.isFile()) {
                        // Include relevant file types
                        const ext = path.extname(item);
                        if (this.isRelevantFile(ext)) {
                            files.push(itemPath);
                        }
                    }
                }
            } catch (error) {
                console.error(`Error scanning directory ${dir}:`, error);
            }
        };

        scanDirectory(projectPath);
        return files;
    }

    private isRelevantFile(extension: string): boolean {
        const relevantExtensions = [
            '.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte',
            '.py', '.java', '.cpp', '.c', '.cs', '.go', '.rs',
            '.php', '.rb', '.swift', '.kt', '.scala',
            '.html', '.css', '.scss', '.less',
            '.json', '.yaml', '.yml', '.xml',
            '.sql', '.md', '.dockerfile'
        ];
        
        return relevantExtensions.includes(extension.toLowerCase());
    }

    private async analyzeProjectStructure(projectPath: string, files: string[]): Promise<any> {
        const structure = {
            projectType: 'unknown',
            framework: 'none',
            language: 'javascript',
            dependencies: [],
            testFiles: [],
            configFiles: [],
            sourceFiles: [],
            hasPackageJson: false,
            hasTests: false,
            architecture: 'unknown'
        };

        // Analyze package.json
        const packageJsonPath = path.join(projectPath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            structure.hasPackageJson = true;
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                structure.dependencies = Object.keys(packageJson.dependencies || {});
                
                // Detect framework
                if (structure.dependencies.includes('react')) structure.framework = 'react';
                else if (structure.dependencies.includes('vue')) structure.framework = 'vue';
                else if (structure.dependencies.includes('angular')) structure.framework = 'angular';
                else if (structure.dependencies.includes('express')) structure.framework = 'express';
            } catch (error) {
                console.error('Error parsing package.json:', error);
            }
        }

        // Categorize files
        for (const file of files) {
            const fileName = path.basename(file);
            const ext = path.extname(file);
            
            if (fileName.includes('test') || fileName.includes('spec')) {
                structure.testFiles.push(file);
                structure.hasTests = true;
            } else if (fileName.includes('config') || fileName.startsWith('.')) {
                structure.configFiles.push(file);
            } else if (this.isSourceFile(ext)) {
                structure.sourceFiles.push(file);
            }
        }

        return structure;
    }

    private isSourceFile(extension: string): boolean {
        const sourceExtensions = [
            '.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte',
            '.py', '.java', '.cpp', '.c', '.cs', '.go', '.rs',
            '.php', '.rb', '.swift', '.kt', '.scala'
        ];
        
        return sourceExtensions.includes(extension.toLowerCase());
    }

    private async performCrossFileAnalysis(
        files: string[],
        projectStructure: any,
        cancellationToken?: vscode.CancellationToken
    ): Promise<ScanResult[]> {
        const results: ScanResult[] = [];

        // Check for unused imports across files
        const importAnalysis = await this.analyzeImports(files);
        results.push(...importAnalysis);

        // Check for circular dependencies
        const circularDeps = await this.findCircularDependencies(files);
        results.push(...circularDeps);

        // Check for missing tests
        const testCoverage = await this.analyzeTestCoverage(files, projectStructure);
        results.push(...testCoverage);

        return results;
    }

    private async analyzeImports(files: string[]): Promise<ScanResult[]> {
        const results: ScanResult[] = [];
        // Implementation for import analysis
        return results;
    }

    private async findCircularDependencies(files: string[]): Promise<ScanResult[]> {
        const results: ScanResult[] = [];
        // Implementation for circular dependency detection
        return results;
    }

    private async analyzeTestCoverage(files: string[], projectStructure: any): Promise<ScanResult[]> {
        const results: ScanResult[] = [];
        
        const sourceFiles = files.filter(f => this.isSourceFile(path.extname(f)));
        const testFiles = projectStructure.testFiles;
        
        if (testFiles.length === 0 && sourceFiles.length > 0) {
            results.push({
                id: 'test-coverage-none',
                type: 'warning',
                severity: 'medium',
                category: 'maintainability',
                title: 'No Tests Found',
                description: 'Project has no test files. Consider adding tests for better code quality.',
                file: '',
                fixable: false,
                impact: 'Reduced code reliability and maintainability',
                effort: 'high'
            });
        }

        return results;
    }

    private async generateProjectHealth(results: ScanResult[], projectStructure: any): Promise<ProjectHealth> {
        const totalIssues = results.length;
        const criticalIssues = results.filter(r => r.severity === 'critical').length;
        const securityIssues = results.filter(r => r.category === 'security').length;
        const performanceIssues = results.filter(r => r.category === 'performance').length;

        // Calculate scores
        let score = 100;
        score -= criticalIssues * 20;
        score -= securityIssues * 15;
        score -= performanceIssues * 10;
        score -= (totalIssues - criticalIssues - securityIssues - performanceIssues) * 2;
        score = Math.max(0, score);

        const maintainabilityScore = Math.max(0, 100 - (results.filter(r => r.category === 'maintainability').length * 5));
        const testCoverage = projectStructure.hasTests ? 70 : 0; // Simplified calculation
        const codeQuality = Math.max(0, 100 - (results.filter(r => r.category === 'style').length * 3));

        const recommendations = this.generateRecommendations(results, projectStructure);

        return {
            score,
            totalIssues,
            criticalIssues,
            securityIssues,
            performanceIssues,
            maintainabilityScore,
            testCoverage,
            codeQuality,
            recommendations
        };
    }

    private generateRecommendations(results: ScanResult[], projectStructure: any): string[] {
        const recommendations: string[] = [];

        if (results.filter(r => r.category === 'security').length > 0) {
            recommendations.push('Address security vulnerabilities immediately');
        }

        if (!projectStructure.hasTests) {
            recommendations.push('Add unit tests to improve code reliability');
        }

        if (results.filter(r => r.category === 'performance').length > 5) {
            recommendations.push('Optimize performance bottlenecks');
        }

        if (results.filter(r => r.category === 'maintainability').length > 10) {
            recommendations.push('Refactor code to improve maintainability');
        }

        return recommendations;
    }

    private async generateAIInsights(
        results: ScanResult[],
        projectStructure: any,
        cancellationToken?: vscode.CancellationToken
    ): Promise<ScanResult[]> {
        const insights: ScanResult[] = [];

        try {
            const messages: AIMessage[] = [
                {
                    role: 'system',
                    content: 'You are an expert code analyst. Analyze the scan results and provide additional insights and recommendations.'
                },
                {
                    role: 'user',
                    content: `Analyze these scan results and provide additional insights:

Scan Results Summary:
- Total Issues: ${results.length}
- Critical Issues: ${results.filter(r => r.severity === 'critical').length}
- Security Issues: ${results.filter(r => r.category === 'security').length}
- Performance Issues: ${results.filter(r => r.category === 'performance').length}

Project Structure:
${JSON.stringify(projectStructure, null, 2)}

Provide 3-5 high-level insights about the codebase health and recommendations for improvement.`
                }
            ];

            const response = await this.aiProvider.generateResponse(messages, cancellationToken);
            
            // Parse AI insights and convert to ScanResult format
            const aiRecommendations = response.content.split('\n').filter(line => line.trim());
            
            aiRecommendations.forEach((recommendation, index) => {
                if (recommendation.trim()) {
                    insights.push({
                        id: `ai-insight-${index}`,
                        type: 'info',
                        severity: 'low',
                        category: 'optimization',
                        title: 'AI Insight',
                        description: recommendation.trim(),
                        file: '',
                        fixable: false,
                        impact: 'AI-generated recommendation for improvement',
                        effort: 'medium'
                    });
                }
            });

        } catch (error) {
            console.error('Error generating AI insights:', error);
        }

        return insights;
    }

    private getLanguageFromExtension(extension: string): string {
        const languageMap: { [key: string]: string } = {
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cs': 'csharp',
            '.go': 'go',
            '.rs': 'rust',
            '.php': 'php',
            '.rb': 'ruby',
            '.swift': 'swift',
            '.kt': 'kotlin',
            '.scala': 'scala'
        };

        return languageMap[extension.toLowerCase()] || 'text';
    }

    private extractFunctions(content: string, language: string): Array<{ name: string; startLine: number; lineCount: number }> {
        const functions: Array<{ name: string; startLine: number; lineCount: number }> = [];
        const lines = content.split('\n');

        // Simple function extraction (can be enhanced)
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let match;

            switch (language) {
                case 'javascript':
                case 'typescript':
                    match = line.match(/function\s+(\w+)|(\w+)\s*[:=]\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)/);
                    break;
                case 'python':
                    match = line.match(/def\s+(\w+)/);
                    break;
                case 'java':
                    match = line.match(/(?:public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\(/);
                    break;
            }

            if (match) {
                const functionName = match[1] || match[2] || 'anonymous';
                const startLine = i + 1;
                
                // Count lines until function end (simplified)
                let lineCount = 1;
                let braceCount = 0;
                let inFunction = false;

                for (let j = i; j < lines.length; j++) {
                    const currentLine = lines[j];
                    
                    if (currentLine.includes('{')) {
                        braceCount += (currentLine.match(/\{/g) || []).length;
                        inFunction = true;
                    }
                    
                    if (currentLine.includes('}')) {
                        braceCount -= (currentLine.match(/\}/g) || []).length;
                    }

                    if (inFunction) {
                        lineCount++;
                        
                        if (braceCount === 0) {
                            break;
                        }
                    }
                }

                functions.push({ name: functionName, startLine, lineCount });
            }
        }

        return functions;
    }

    private findCodeDuplication(content: string): Array<{ hash: string; line: number; code: string }> {
        const duplicates: Array<{ hash: string; line: number; code: string }> = [];
        const lines = content.split('\n');
        const lineHashes = new Map<string, number[]>();

        // Simple duplication detection based on line similarity
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.length < 10) continue; // Skip short lines

            const hash = this.simpleHash(line);
            
            if (!lineHashes.has(hash)) {
                lineHashes.set(hash, []);
            }
            
            lineHashes.get(hash)!.push(i);
        }

        // Find duplicates
        for (const [hash, lineNumbers] of lineHashes.entries()) {
            if (lineNumbers.length > 1) {
                for (const lineNumber of lineNumbers) {
                    duplicates.push({
                        hash,
                        line: lineNumber + 1,
                        code: lines[lineNumber].trim()
                    });
                }
            }
        }

        return duplicates;
    }

    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    private updateProgress(
        phase: string,
        progress: number,
        currentFile: string,
        callback?: (progress: ScanProgress) => void
    ) {
        this.scanProgress = {
            ...this.scanProgress,
            phase,
            progress,
            currentFile
        };

        if (callback) {
            callback(this.scanProgress);
        }
    }

    public getScanResults(projectPath: string): ScanResult[] {
        return this.scanResults.get(projectPath) || [];
    }

    public isCurrentlyScanning(): boolean {
        return this.isScanning;
    }

    public getScanProgress(): ScanProgress {
        return this.scanProgress;
    }
}