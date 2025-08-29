import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AIProvider, AIMessage } from './aiProvider';

export interface ProjectStructure {
    name: string;
    type: 'file' | 'folder';
    content?: string;
    children?: ProjectStructure[];
}

export interface ProjectTemplate {
    name: string;
    description: string;
    type: string;
    structure: ProjectStructure[];
    dependencies?: string[];
    scripts?: { [key: string]: string };
}

export class ProjectBuilder {
    constructor(private aiProvider: AIProvider) {}

    public async buildProjectFromDescription(
        description: string,
        workspaceFolder: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<void> {
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are an expert full-stack developer and project architect. Based on the user's description, create a complete project structure with all necessary files, configurations, and code.

IMPORTANT: Respond with a JSON object that has this exact structure:
{
  "projectName": "string",
  "projectType": "string (e.g., 'react-app', 'node-api', 'python-web', etc.)",
  "description": "string",
  "structure": [
    {
      "name": "filename or foldername",
      "type": "file" or "folder",
      "content": "file content (only for files)",
      "children": [] // only for folders
    }
  ],
  "dependencies": ["package1", "package2"],
  "devDependencies": ["dev-package1", "dev-package2"],
  "scripts": {
    "start": "command",
    "build": "command",
    "test": "command"
  },
  "setupInstructions": ["step 1", "step 2", "step 3"]
}

Include:
- Complete file structure
- All necessary configuration files (package.json, tsconfig.json, etc.)
- Source code files with full implementation
- README.md with setup instructions
- Environment files (.env.example)
- Testing setup
- Build configurations
- Deployment configurations if applicable

Make the project production-ready and follow best practices.`
            },
            {
                role: 'user',
                content: `Create a complete project for: ${description}

Please generate a full project structure with all files and code needed to build this from scratch. Include proper error handling, testing, documentation, and deployment configurations.`
            }
        ];

        const response = await this.aiProvider.generateResponse(messages, cancellationToken);
        const projectData = this.parseProjectResponse(response.content);
        
        await this.createProjectStructure(projectData, workspaceFolder);
        await this.showProjectSummary(projectData);
    }

    public async generateProjectTemplate(
        templateType: string,
        projectName: string,
        workspaceFolder: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<void> {
        const templates = this.getProjectTemplates();
        const template = templates.find(t => t.type === templateType);
        
        if (!template) {
            throw new Error(`Template ${templateType} not found`);
        }

        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are an expert developer. Generate a complete ${templateType} project named "${projectName}" based on the template structure. Customize all files with proper content, configurations, and code.

Return a JSON object with the same structure as before, but fully customized for the project name and type.`
            },
            {
                role: 'user',
                content: `Generate a complete ${templateType} project named "${projectName}". Include all necessary files, configurations, and code. Make it production-ready with proper error handling, testing, and documentation.

Template type: ${templateType}
Project name: ${projectName}

Customize everything for this specific project.`
            }
        ];

        const response = await this.aiProvider.generateResponse(messages, cancellationToken);
        const projectData = this.parseProjectResponse(response.content);
        
        await this.createProjectStructure(projectData, workspaceFolder);
        await this.showProjectSummary(projectData);
    }

    public async enhanceExistingProject(
        enhancement: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        const currentStructure = await this.analyzeCurrentProject(workspaceFolder.uri.fsPath);
        
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are an expert developer. Analyze the current project structure and enhance it based on the user's request. 

Current project structure:
${JSON.stringify(currentStructure, null, 2)}

Provide a JSON response with:
{
  "newFiles": [
    {
      "name": "path/to/file",
      "type": "file",
      "content": "file content"
    }
  ],
  "modifiedFiles": [
    {
      "name": "path/to/existing/file",
      "type": "file",
      "content": "updated content"
    }
  ],
  "newDependencies": ["package1", "package2"],
  "instructions": ["step 1", "step 2"]
}

Only include files that need to be created or modified.`
            },
            {
                role: 'user',
                content: `Enhance the current project with: ${enhancement}

Analyze the existing structure and provide the necessary files and modifications to implement this enhancement. Include any new dependencies and setup instructions.`
            }
        ];

        const response = await this.aiProvider.generateResponse(messages, cancellationToken);
        const enhancementData = this.parseEnhancementResponse(response.content);
        
        await this.applyProjectEnhancements(enhancementData, workspaceFolder.uri.fsPath);
        await this.showEnhancementSummary(enhancementData);
    }

    public async generateDocumentation(
        docType: 'api' | 'user' | 'developer' | 'deployment',
        cancellationToken?: vscode.CancellationToken
    ): Promise<void> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }

        const projectStructure = await this.analyzeCurrentProject(workspaceFolder.uri.fsPath);
        
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are a technical writer and developer. Generate comprehensive ${docType} documentation for the project.

Project structure:
${JSON.stringify(projectStructure, null, 2)}

Generate detailed documentation in Markdown format that includes:
- Clear explanations
- Code examples
- Setup instructions
- Usage examples
- Best practices
- Troubleshooting guides`
            },
            {
                role: 'user',
                content: `Generate comprehensive ${docType} documentation for this project. Make it professional, clear, and complete with examples and instructions.`
            }
        ];

        const response = await this.aiProvider.generateResponse(messages, cancellationToken);
        
        const docFileName = `docs/${docType}-documentation.md`;
        const docPath = path.join(workspaceFolder.uri.fsPath, docFileName);
        
        // Ensure docs directory exists
        const docsDir = path.dirname(docPath);
        if (!fs.existsSync(docsDir)) {
            fs.mkdirSync(docsDir, { recursive: true });
        }
        
        fs.writeFileSync(docPath, response.content);
        
        // Open the documentation file
        const docUri = vscode.Uri.file(docPath);
        await vscode.window.showTextDocument(docUri);
        
        vscode.window.showInformationMessage(`${docType} documentation generated: ${docFileName}`);
    }

    private parseProjectResponse(response: string): any {
        try {
            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            
            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            throw new Error(`Failed to parse project response: ${error}`);
        }
    }

    private parseEnhancementResponse(response: string): any {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            
            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            throw new Error(`Failed to parse enhancement response: ${error}`);
        }
    }

    private async createProjectStructure(projectData: any, workspaceFolder: string): Promise<void> {
        const projectPath = path.join(workspaceFolder, projectData.projectName);
        
        // Create project directory
        if (!fs.existsSync(projectPath)) {
            fs.mkdirSync(projectPath, { recursive: true });
        }

        // Create file structure
        await this.createStructureRecursive(projectData.structure, projectPath);
        
        // Create package.json if dependencies are specified
        if (projectData.dependencies || projectData.devDependencies || projectData.scripts) {
            const packageJson = {
                name: projectData.projectName,
                version: '1.0.0',
                description: projectData.description,
                scripts: projectData.scripts || {},
                dependencies: this.arrayToObject(projectData.dependencies || []),
                devDependencies: this.arrayToObject(projectData.devDependencies || [])
            };
            
            const packagePath = path.join(projectPath, 'package.json');
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
        }

        // Open the project in a new window
        const projectUri = vscode.Uri.file(projectPath);
        await vscode.commands.executeCommand('vscode.openFolder', projectUri, true);
    }

    private async createStructureRecursive(structure: ProjectStructure[], basePath: string): Promise<void> {
        for (const item of structure) {
            const itemPath = path.join(basePath, item.name);
            
            if (item.type === 'folder') {
                if (!fs.existsSync(itemPath)) {
                    fs.mkdirSync(itemPath, { recursive: true });
                }
                
                if (item.children) {
                    await this.createStructureRecursive(item.children, itemPath);
                }
            } else if (item.type === 'file') {
                const dir = path.dirname(itemPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                
                fs.writeFileSync(itemPath, item.content || '');
            }
        }
    }

    private async analyzeCurrentProject(projectPath: string): Promise<any> {
        const structure: any = {
            files: [],
            directories: [],
            packageJson: null,
            technologies: []
        };

        try {
            // Read package.json if it exists
            const packageJsonPath = path.join(projectPath, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                structure.packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            }

            // Analyze file structure (limit depth for performance)
            structure.files = this.getFileList(projectPath, 2);
            
            return structure;
        } catch (error) {
            console.error('Error analyzing project:', error);
            return structure;
        }
    }

    private getFileList(dir: string, maxDepth: number, currentDepth: number = 0): string[] {
        if (currentDepth >= maxDepth) return [];
        
        const files: string[] = [];
        
        try {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                if (item.startsWith('.') || item === 'node_modules') continue;
                
                const itemPath = path.join(dir, item);
                const stat = fs.statSync(itemPath);
                
                if (stat.isFile()) {
                    files.push(itemPath);
                } else if (stat.isDirectory()) {
                    files.push(...this.getFileList(itemPath, maxDepth, currentDepth + 1));
                }
            }
        } catch (error) {
            console.error('Error reading directory:', error);
        }
        
        return files;
    }

    private async applyProjectEnhancements(enhancementData: any, projectPath: string): Promise<void> {
        // Create new files
        if (enhancementData.newFiles) {
            for (const file of enhancementData.newFiles) {
                const filePath = path.join(projectPath, file.name);
                const dir = path.dirname(filePath);
                
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                
                fs.writeFileSync(filePath, file.content);
            }
        }

        // Modify existing files
        if (enhancementData.modifiedFiles) {
            for (const file of enhancementData.modifiedFiles) {
                const filePath = path.join(projectPath, file.name);
                fs.writeFileSync(filePath, file.content);
            }
        }

        // Update package.json with new dependencies
        if (enhancementData.newDependencies && enhancementData.newDependencies.length > 0) {
            const packageJsonPath = path.join(projectPath, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                
                if (!packageJson.dependencies) {
                    packageJson.dependencies = {};
                }
                
                for (const dep of enhancementData.newDependencies) {
                    packageJson.dependencies[dep] = 'latest';
                }
                
                fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
            }
        }
    }

    private async showProjectSummary(projectData: any): Promise<void> {
        const summary = `
# Project Created Successfully! 🎉

**Project Name:** ${projectData.projectName}
**Type:** ${projectData.projectType}
**Description:** ${projectData.description}

## Next Steps:
${projectData.setupInstructions ? projectData.setupInstructions.map((step: string, i: number) => `${i + 1}. ${step}`).join('\n') : '1. Navigate to the project folder\n2. Install dependencies: npm install\n3. Start development: npm start'}

## Dependencies:
${projectData.dependencies ? projectData.dependencies.join(', ') : 'None'}

## Dev Dependencies:
${projectData.devDependencies ? projectData.devDependencies.join(', ') : 'None'}

The project has been created and opened in a new window. Happy coding! 🚀
        `;

        const panel = vscode.window.createWebviewPanel(
            'projectSummary',
            'Project Created',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        panel.webview.html = this.getProjectSummaryHtml(summary);
    }

    private async showEnhancementSummary(enhancementData: any): Promise<void> {
        const summary = `
# Project Enhanced Successfully! ✨

## Changes Made:
${enhancementData.newFiles ? `\n**New Files Created:**\n${enhancementData.newFiles.map((f: any) => `- ${f.name}`).join('\n')}` : ''}
${enhancementData.modifiedFiles ? `\n**Files Modified:**\n${enhancementData.modifiedFiles.map((f: any) => `- ${f.name}`).join('\n')}` : ''}
${enhancementData.newDependencies ? `\n**New Dependencies:**\n${enhancementData.newDependencies.join(', ')}` : ''}

## Next Steps:
${enhancementData.instructions ? enhancementData.instructions.map((step: string, i: number) => `${i + 1}. ${step}`).join('\n') : '1. Review the changes\n2. Install any new dependencies\n3. Test the enhancements'}

Your project has been enhanced! 🚀
        `;

        vscode.window.showInformationMessage('Project enhanced successfully!', 'View Summary').then(selection => {
            if (selection === 'View Summary') {
                const panel = vscode.window.createWebviewPanel(
                    'enhancementSummary',
                    'Enhancement Summary',
                    vscode.ViewColumn.One,
                    { enableScripts: true }
                );

                panel.webview.html = this.getProjectSummaryHtml(summary);
            }
        });
    }

    private getProjectSummaryHtml(content: string): string {
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
                code {
                    background-color: var(--vscode-textBlockQuote-background);
                    padding: 2px 4px;
                    border-radius: 2px;
                }
                pre {
                    background-color: var(--vscode-textBlockQuote-background);
                    padding: 10px;
                    border-radius: 4px;
                    overflow-x: auto;
                }
            </style>
        </head>
        <body>
            <div>${content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
        </body>
        </html>
        `;
    }

    private arrayToObject(arr: string[]): { [key: string]: string } {
        const obj: { [key: string]: string } = {};
        arr.forEach(item => {
            obj[item] = 'latest';
        });
        return obj;
    }

    private getProjectTemplates(): ProjectTemplate[] {
        return [
            {
                name: 'React TypeScript App',
                description: 'Modern React application with TypeScript',
                type: 'react-typescript',
                structure: [],
                dependencies: ['react', 'react-dom', 'typescript'],
                scripts: {
                    'start': 'react-scripts start',
                    'build': 'react-scripts build',
                    'test': 'react-scripts test'
                }
            },
            {
                name: 'Node.js API',
                description: 'RESTful API with Express and TypeScript',
                type: 'node-api',
                structure: [],
                dependencies: ['express', 'cors', 'helmet'],
                scripts: {
                    'start': 'node dist/index.js',
                    'dev': 'nodemon src/index.ts',
                    'build': 'tsc'
                }
            },
            {
                name: 'Python Web App',
                description: 'Flask web application',
                type: 'python-web',
                structure: [],
                dependencies: ['flask', 'flask-cors'],
                scripts: {
                    'start': 'python app.py',
                    'dev': 'flask run --debug'
                }
            }
        ];
    }
}