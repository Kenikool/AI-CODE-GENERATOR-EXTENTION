import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AIProvider, AIMessage } from './aiProvider';

export interface CodebaseInsight {
    type: 'architecture' | 'patterns' | 'issues' | 'suggestions' | 'dependencies';
    title: string;
    description: string;
    files: string[];
    severity?: 'low' | 'medium' | 'high';
    category?: string;
}

export interface FileAnalysis {
    path: string;
    language: string;
    complexity: number;
    issues: string[];
    suggestions: string[];
    dependencies: string[];
}

export class CodebaseAnalyzer {
    constructor(private aiProvider: AIProvider) {}

    public async analyzeFullCodebase(
        workspacePath: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<CodebaseInsight[]> {
        const codebaseStructure = await this.scanCodebase(workspacePath);
        
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are a senior software architect and code reviewer. Analyze the provided codebase structure and provide comprehensive insights.

Analyze for:
1. Architecture patterns and design decisions
2. Code quality and best practices
3. Security vulnerabilities
4. Performance issues
5. Maintainability concerns
6. Testing coverage gaps
7. Documentation needs
8. Dependency management
9. Code duplication
10. Scalability considerations

Return a JSON array of insights with this structure:
[
  {
    "type": "architecture|patterns|issues|suggestions|dependencies",
    "title": "Brief title",
    "description": "Detailed description with specific examples",
    "files": ["list", "of", "relevant", "files"],
    "severity": "low|medium|high",
    "category": "security|performance|maintainability|etc"
  }
]

Be specific and actionable in your recommendations.`
            },
            {
                role: 'user',
                content: `Analyze this codebase structure and provide comprehensive insights:

${JSON.stringify(codebaseStructure, null, 2)}

Focus on architecture, code quality, security, performance, and maintainability. Provide specific, actionable recommendations.`
            }
        ];

        const response = await this.aiProvider.generateResponse(messages, cancellationToken);
        return this.parseInsights(response.content);
    }

    public async analyzeSpecificFiles(
        filePaths: string[],
        analysisType: 'security' | 'performance' | 'quality' | 'architecture',
        cancellationToken?: vscode.CancellationToken
    ): Promise<FileAnalysis[]> {
        const fileContents = await this.readFiles(filePaths);
        
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are an expert code analyzer specializing in ${analysisType} analysis. Analyze the provided files and return detailed insights.

Return a JSON array with this structure:
[
  {
    "path": "file/path",
    "language": "programming language",
    "complexity": 1-10,
    "issues": ["list of issues found"],
    "suggestions": ["list of improvement suggestions"],
    "dependencies": ["list of dependencies/imports"]
  }
]

Focus specifically on ${analysisType} aspects.`
            },
            {
                role: 'user',
                content: `Analyze these files for ${analysisType}:

${JSON.stringify(fileContents, null, 2)}

Provide detailed analysis focusing on ${analysisType} aspects.`
            }
        ];

        const response = await this.aiProvider.generateResponse(messages, cancellationToken);
        return this.parseFileAnalysis(response.content);
    }

    public async generateRefactoringPlan(
        targetFiles: string[],
        refactoringGoal: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<any> {
        const fileContents = await this.readFiles(targetFiles);
        
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are a refactoring expert. Create a detailed refactoring plan based on the goal and current code.

Return a JSON object with this structure:
{
  "goal": "refactoring goal",
  "steps": [
    {
      "step": 1,
      "title": "Step title",
      "description": "What to do",
      "files": ["files to modify"],
      "changes": [
        {
          "file": "path/to/file",
          "type": "modify|create|delete|rename",
          "description": "what changes to make",
          "code": "new code if applicable"
        }
      ],
      "risks": ["potential risks"],
      "testing": "how to test this step"
    }
  ],
  "benefits": ["expected benefits"],
  "risks": ["overall risks"],
  "estimatedTime": "time estimate"
}`
            },
            {
                role: 'user',
                content: `Create a refactoring plan for: ${refactoringGoal}

Current code:
${JSON.stringify(fileContents, null, 2)}

Provide a step-by-step plan with specific changes, risks, and testing strategies.`
            }
        ];

        const response = await this.aiProvider.generateResponse(messages, cancellationToken);
        return this.parseRefactoringPlan(response.content);
    }

    public async findCodePatterns(
        workspacePath: string,
        patternType: 'design-patterns' | 'anti-patterns' | 'code-smells' | 'best-practices',
        cancellationToken?: vscode.CancellationToken
    ): Promise<any[]> {
        const codebaseStructure = await this.scanCodebase(workspacePath);
        
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are a code pattern expert. Identify ${patternType} in the codebase.

Return a JSON array with this structure:
[
  {
    "pattern": "pattern name",
    "type": "${patternType}",
    "description": "what this pattern is",
    "locations": [
      {
        "file": "file path",
        "lines": "line numbers or range",
        "code": "relevant code snippet"
      }
    ],
    "impact": "positive|negative|neutral",
    "recommendation": "what to do about it"
  }
]`
            },
            {
                role: 'user',
                content: `Find ${patternType} in this codebase:

${JSON.stringify(codebaseStructure, null, 2)}

Identify specific instances with file locations and provide recommendations.`
            }
        ];

        const response = await this.aiProvider.generateResponse(messages, cancellationToken);
        return this.parsePatterns(response.content);
    }

    public async generateTestStrategy(
        workspacePath: string,
        testType: 'unit' | 'integration' | 'e2e' | 'performance',
        cancellationToken?: vscode.CancellationToken
    ): Promise<any> {
        const codebaseStructure = await this.scanCodebase(workspacePath);
        
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are a testing expert. Create a comprehensive ${testType} testing strategy.

Return a JSON object with this structure:
{
  "testType": "${testType}",
  "strategy": "overall testing approach",
  "framework": "recommended testing framework",
  "setup": {
    "dependencies": ["required packages"],
    "configuration": "setup instructions",
    "structure": "recommended test structure"
  },
  "testPlans": [
    {
      "component": "what to test",
      "file": "source file",
      "testFile": "test file path",
      "scenarios": ["test scenarios"],
      "priority": "high|medium|low"
    }
  ],
  "coverage": {
    "target": "coverage percentage goal",
    "critical": ["critical areas to test"],
    "optional": ["nice-to-have tests"]
  },
  "automation": {
    "ci": "CI/CD integration",
    "scripts": {"script": "command"}
  }
}`
            },
            {
                role: 'user',
                content: `Create a ${testType} testing strategy for this codebase:

${JSON.stringify(codebaseStructure, null, 2)}

Include framework recommendations, test structure, and specific test plans.`
            }
        ];

        const response = await this.aiProvider.generateResponse(messages, cancellationToken);
        return this.parseTestStrategy(response.content);
    }

    public async optimizePerformance(
        targetFiles: string[],
        optimizationType: 'memory' | 'speed' | 'bundle-size' | 'database',
        cancellationToken?: vscode.CancellationToken
    ): Promise<any> {
        const fileContents = await this.readFiles(targetFiles);
        
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are a performance optimization expert. Analyze the code and provide ${optimizationType} optimization recommendations.

Return a JSON object with this structure:
{
  "optimizationType": "${optimizationType}",
  "currentIssues": [
    {
      "file": "file path",
      "issue": "performance issue description",
      "impact": "high|medium|low",
      "location": "specific location in code"
    }
  ],
  "optimizations": [
    {
      "title": "optimization title",
      "description": "what to optimize",
      "file": "file to modify",
      "before": "current code",
      "after": "optimized code",
      "expectedImprovement": "expected performance gain",
      "effort": "low|medium|high"
    }
  ],
  "tools": ["recommended tools for monitoring"],
  "metrics": ["metrics to track"],
  "bestPractices": ["general best practices"]
}`
            },
            {
                role: 'user',
                content: `Analyze and optimize for ${optimizationType} performance:

${JSON.stringify(fileContents, null, 2)}

Provide specific code optimizations with before/after examples.`
            }
        ];

        const response = await this.aiProvider.generateResponse(messages, cancellationToken);
        return this.parseOptimizations(response.content);
    }

    private async scanCodebase(workspacePath: string): Promise<any> {
        const structure = {
            projectInfo: await this.getProjectInfo(workspacePath),
            fileStructure: await this.getFileStructure(workspacePath),
            dependencies: await this.getDependencies(workspacePath),
            codeMetrics: await this.getCodeMetrics(workspacePath)
        };

        return structure;
    }

    private async getProjectInfo(workspacePath: string): Promise<any> {
        const info: any = {
            name: path.basename(workspacePath),
            path: workspacePath
        };

        try {
            const packageJsonPath = path.join(workspacePath, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                info.packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            }

            const readmePath = path.join(workspacePath, 'README.md');
            if (fs.existsSync(readmePath)) {
                info.readme = fs.readFileSync(readmePath, 'utf8').substring(0, 1000); // First 1000 chars
            }
        } catch (error) {
            console.error('Error reading project info:', error);
        }

        return info;
    }

    private async getFileStructure(workspacePath: string, maxDepth: number = 3): Promise<any[]> {
        const files: any[] = [];
        
        try {
            const items = fs.readdirSync(workspacePath);
            
            for (const item of items) {
                if (item.startsWith('.') || item === 'node_modules' || item === 'dist' || item === 'build') {
                    continue;
                }
                
                const itemPath = path.join(workspacePath, item);
                const stat = fs.statSync(itemPath);
                
                if (stat.isFile()) {
                    const ext = path.extname(item);
                    if (['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.go', '.rs', '.php', '.rb'].includes(ext)) {
                        files.push({
                            name: item,
                            path: itemPath,
                            type: 'file',
                            extension: ext,
                            size: stat.size,
                            content: this.getFilePreview(itemPath)
                        });
                    }
                } else if (stat.isDirectory() && maxDepth > 0) {
                    const subFiles = await this.getFileStructure(itemPath, maxDepth - 1);
                    if (subFiles.length > 0) {
                        files.push({
                            name: item,
                            path: itemPath,
                            type: 'directory',
                            children: subFiles
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error scanning file structure:', error);
        }
        
        return files;
    }

    private getFilePreview(filePath: string): string {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return content.substring(0, 500); // First 500 characters
        } catch (error) {
            return '';
        }
    }

    private async getDependencies(workspacePath: string): Promise<any> {
        const deps: any = {
            production: {},
            development: {},
            total: 0
        };

        try {
            const packageJsonPath = path.join(workspacePath, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                deps.production = packageJson.dependencies || {};
                deps.development = packageJson.devDependencies || {};
                deps.total = Object.keys(deps.production).length + Object.keys(deps.development).length;
            }
        } catch (error) {
            console.error('Error reading dependencies:', error);
        }

        return deps;
    }

    private async getCodeMetrics(workspacePath: string): Promise<any> {
        const metrics = {
            totalFiles: 0,
            totalLines: 0,
            languages: {} as { [key: string]: number },
            avgFileSize: 0
        };

        try {
            const files = await this.getAllCodeFiles(workspacePath);
            metrics.totalFiles = files.length;

            for (const file of files) {
                const ext = path.extname(file);
                metrics.languages[ext] = (metrics.languages[ext] || 0) + 1;

                try {
                    const content = fs.readFileSync(file, 'utf8');
                    const lines = content.split('\n').length;
                    metrics.totalLines += lines;
                } catch (error) {
                    // Skip files that can't be read
                }
            }

            metrics.avgFileSize = metrics.totalFiles > 0 ? Math.round(metrics.totalLines / metrics.totalFiles) : 0;
        } catch (error) {
            console.error('Error calculating code metrics:', error);
        }

        return metrics;
    }

    private async getAllCodeFiles(dir: string, files: string[] = []): Promise<string[]> {
        try {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                if (item.startsWith('.') || item === 'node_modules') continue;
                
                const itemPath = path.join(dir, item);
                const stat = fs.statSync(itemPath);
                
                if (stat.isFile()) {
                    const ext = path.extname(item);
                    if (['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.go', '.rs', '.php', '.rb'].includes(ext)) {
                        files.push(itemPath);
                    }
                } else if (stat.isDirectory()) {
                    await this.getAllCodeFiles(itemPath, files);
                }
            }
        } catch (error) {
            console.error('Error reading directory:', error);
        }
        
        return files;
    }

    private async readFiles(filePaths: string[]): Promise<any[]> {
        const files = [];
        
        for (const filePath of filePaths) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                files.push({
                    path: filePath,
                    name: path.basename(filePath),
                    extension: path.extname(filePath),
                    content: content
                });
            } catch (error) {
                console.error(`Error reading file ${filePath}:`, error);
            }
        }
        
        return files;
    }

    private parseInsights(response: string): CodebaseInsight[] {
        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('No JSON array found in response');
            }
            
            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error('Error parsing insights:', error);
            return [];
        }
    }

    private parseFileAnalysis(response: string): FileAnalysis[] {
        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('No JSON array found in response');
            }
            
            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error('Error parsing file analysis:', error);
            return [];
        }
    }

    private parseRefactoringPlan(response: string): any {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON object found in response');
            }
            
            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error('Error parsing refactoring plan:', error);
            return null;
        }
    }

    private parsePatterns(response: string): any[] {
        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('No JSON array found in response');
            }
            
            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error('Error parsing patterns:', error);
            return [];
        }
    }

    private parseTestStrategy(response: string): any {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON object found in response');
            }
            
            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error('Error parsing test strategy:', error);
            return null;
        }
    }

    private parseOptimizations(response: string): any {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON object found in response');
            }
            
            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error('Error parsing optimizations:', error);
            return null;
        }
    }
}