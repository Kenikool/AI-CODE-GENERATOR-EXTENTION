import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AIProvider, AIMessage } from './aiProvider';

export interface FileTemplate {
    name: string;
    extension: string;
    content: string;
    description: string;
    category: string;
}

export interface FolderStructure {
    name: string;
    type: 'file' | 'folder';
    content?: string;
    children?: FolderStructure[];
}

export interface ProjectScaffold {
    name: string;
    description: string;
    structure: FolderStructure[];
    dependencies: string[];
    devDependencies: string[];
    scripts: { [key: string]: string };
    postInstallCommands: string[];
}

export class FileSystemManager {
    private templates: Map<string, FileTemplate[]> = new Map();

    constructor(private aiProvider: AIProvider) {
        this.initializeTemplates();
    }

    public async createSmartFile(
        fileName?: string,
        fileType?: string,
        targetPath?: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<void> {
        try {
            // Get target directory
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder found');
            }

            const basePath = targetPath || workspaceFolder.uri.fsPath;

            // If no fileName provided, ask user
            if (!fileName) {
                fileName = await vscode.window.showInputBox({
                    prompt: 'Enter file name (with or without extension)',
                    placeHolder: 'e.g., UserService.ts, api.py, styles.css, README.md'
                });

                if (!fileName) return;
            }

            // Detect file type and extension
            const fileInfo = this.analyzeFileName(fileName);
            
            // Get AI-generated content based on file type and context
            const content = await this.generateFileContent(
                fileInfo.name,
                fileInfo.extension,
                fileInfo.type,
                basePath,
                cancellationToken
            );

            // Create the file
            const fullPath = path.join(basePath, fileName);
            const dir = path.dirname(fullPath);

            // Ensure directory exists
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Write file
            fs.writeFileSync(fullPath, content);

            // Open the file
            const fileUri = vscode.Uri.file(fullPath);
            await vscode.window.showTextDocument(fileUri);

            vscode.window.showInformationMessage(`✅ Created ${fileName} with smart content!`);

        } catch (error) {
            vscode.window.showErrorMessage(`Error creating file: ${error}`);
        }
    }

    public async createSmartFolder(
        folderName?: string,
        folderType?: string,
        targetPath?: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('No workspace folder found');
            }

            const basePath = targetPath || workspaceFolder.uri.fsPath;

            // If no folderName provided, ask user
            if (!folderName) {
                const folderInput = await vscode.window.showInputBox({
                    prompt: 'Enter folder name and type',
                    placeHolder: 'e.g., "components" (React), "controllers" (API), "tests" (Testing)'
                });

                if (!folderInput) return;
                folderName = folderInput;
            }

            // Analyze folder purpose and generate structure
            const folderStructure = await this.generateFolderStructure(
                folderName,
                folderType,
                basePath,
                cancellationToken
            );

            // Create the folder structure
            await this.createFolderStructure(folderStructure, basePath);

            vscode.window.showInformationMessage(`✅ Created smart folder structure: ${folderName}`);

        } catch (error) {
            vscode.window.showErrorMessage(`Error creating folder: ${error}`);
        }
    }

    public async createProjectStructure(
        projectType: string,
        projectName: string,
        targetPath: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<void> {
        try {
            // Generate complete project structure using AI
            const scaffold = await this.generateProjectScaffold(
                projectType,
                projectName,
                cancellationToken
            );

            // Create the project directory
            const projectPath = path.join(targetPath, projectName);
            if (!fs.existsSync(projectPath)) {
                fs.mkdirSync(projectPath, { recursive: true });
            }

            // Create folder structure
            await this.createFolderStructure(scaffold.structure, projectPath);

            // Create package.json or equivalent
            await this.createProjectConfig(scaffold, projectPath);

            vscode.window.showInformationMessage(`✅ Created project structure: ${projectName}`);

        } catch (error) {
            vscode.window.showErrorMessage(`Error creating project structure: ${error}`);
        }
    }

    public async createFileFromTemplate(
        templateName: string,
        fileName: string,
        targetPath: string,
        customizations?: { [key: string]: string }
    ): Promise<void> {
        try {
            const template = this.findTemplate(templateName);
            if (!template) {
                throw new Error(`Template ${templateName} not found`);
            }

            let content = template.content;

            // Apply customizations
            if (customizations) {
                for (const [key, value] of Object.entries(customizations)) {
                    content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
                }
            }

            // Replace common placeholders
            content = content.replace(/{{fileName}}/g, path.parse(fileName).name);
            content = content.replace(/{{className}}/g, this.toPascalCase(path.parse(fileName).name));
            content = content.replace(/{{date}}/g, new Date().toISOString().split('T')[0]);

            const fullPath = path.join(targetPath, fileName);
            const dir = path.dirname(fullPath);

            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(fullPath, content);

            const fileUri = vscode.Uri.file(fullPath);
            await vscode.window.showTextDocument(fileUri);

            vscode.window.showInformationMessage(`✅ Created ${fileName} from template!`);

        } catch (error) {
            vscode.window.showErrorMessage(`Error creating file from template: ${error}`);
        }
    }

    public async createMultipleFiles(
        fileSpecs: Array<{ name: string; type?: string; content?: string }>,
        targetPath: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<void> {
        try {
            const results = [];

            for (const spec of fileSpecs) {
                const content = spec.content || await this.generateFileContent(
                    spec.name,
                    path.extname(spec.name),
                    spec.type,
                    targetPath,
                    cancellationToken
                );

                const fullPath = path.join(targetPath, spec.name);
                const dir = path.dirname(fullPath);

                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                fs.writeFileSync(fullPath, content);
                results.push(spec.name);
            }

            vscode.window.showInformationMessage(`✅ Created ${results.length} files: ${results.join(', ')}`);

        } catch (error) {
            vscode.window.showErrorMessage(`Error creating multiple files: ${error}`);
        }
    }

    private async generateFileContent(
        fileName: string,
        extension: string,
        fileType: string | undefined,
        contextPath: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<string> {
        // Analyze project context
        const projectContext = await this.analyzeProjectContext(contextPath);
        
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are an expert developer. Generate appropriate file content based on the file name, extension, and project context.

Rules:
1. Generate production-ready, well-structured code
2. Include proper imports, exports, and dependencies
3. Add comprehensive comments and documentation
4. Follow best practices for the detected language/framework
5. Include error handling where appropriate
6. Make the code functional and ready to use

File naming conventions:
- PascalCase for classes/components
- camelCase for functions/variables
- kebab-case for CSS/HTML files
- UPPER_CASE for constants/env files

Return only the file content, no explanations.`
            },
            {
                role: 'user',
                content: `Generate content for file: ${fileName}${extension}

Project context:
${JSON.stringify(projectContext, null, 2)}

File type: ${fileType || 'auto-detect from extension'}
Extension: ${extension}

Generate appropriate, production-ready content for this file.`
            }
        ];

        try {
            const response = await this.aiProvider.generateResponse(messages, cancellationToken);
            return this.cleanCodeResponse(response.content);
        } catch (error) {
            console.error('Error generating file content:', error);
            return this.getFallbackContent(fileName, extension);
        }
    }

    private async generateFolderStructure(
        folderName: string,
        folderType: string | undefined,
        contextPath: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<FolderStructure> {
        const projectContext = await this.analyzeProjectContext(contextPath);

        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are an expert developer. Generate a smart folder structure based on the folder name and project context.

Return a JSON object with this structure:
{
  "name": "folder-name",
  "type": "folder",
  "children": [
    {
      "name": "file-or-subfolder",
      "type": "file" or "folder",
      "content": "file content (only for files)",
      "children": [] // only for folders
    }
  ]
}

Include:
- Appropriate subfolders for organization
- Common files with proper extensions
- Index files for modules
- Configuration files if needed
- README files for documentation
- Test files if appropriate

Make it production-ready and follow best practices.`
            },
            {
                role: 'user',
                content: `Generate folder structure for: ${folderName}

Project context:
${JSON.stringify(projectContext, null, 2)}

Folder type: ${folderType || 'auto-detect from name'}

Create a comprehensive, well-organized folder structure.`
            }
        ];

        try {
            const response = await this.aiProvider.generateResponse(messages, cancellationToken);
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.error('Error generating folder structure:', error);
        }

        // Fallback structure
        return {
            name: folderName,
            type: 'folder',
            children: [
                {
                    name: 'index.js',
                    type: 'file',
                    content: `// ${folderName} module\nexport * from './${folderName}';\n`
                },
                {
                    name: 'README.md',
                    type: 'file',
                    content: `# ${folderName}\n\nDescription of ${folderName} module.\n`
                }
            ]
        };
    }

    private async generateProjectScaffold(
        projectType: string,
        projectName: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<ProjectScaffold> {
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are an expert project architect. Generate a complete project scaffold based on the project type.

Return a JSON object with this structure:
{
  "name": "project-name",
  "description": "project description",
  "structure": [
    {
      "name": "folder-or-file",
      "type": "folder" or "file",
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
  "postInstallCommands": ["command1", "command2"]
}

Include:
- Complete folder structure
- All necessary configuration files
- Source code files with boilerplate
- Testing setup
- Build configuration
- Documentation files
- Environment files

Make it production-ready and follow industry best practices.`
            },
            {
                role: 'user',
                content: `Generate project scaffold for:
Project Type: ${projectType}
Project Name: ${projectName}

Create a comprehensive, production-ready project structure.`
            }
        ];

        try {
            const response = await this.aiProvider.generateResponse(messages, cancellationToken);
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.error('Error generating project scaffold:', error);
        }

        // Fallback scaffold
        return {
            name: projectName,
            description: `A ${projectType} project`,
            structure: [
                {
                    name: 'src',
                    type: 'folder',
                    children: [
                        {
                            name: 'index.js',
                            type: 'file',
                            content: `// ${projectName} entry point\nconsole.log('Hello from ${projectName}!');\n`
                        }
                    ]
                },
                {
                    name: 'README.md',
                    type: 'file',
                    content: `# ${projectName}\n\nA ${projectType} project.\n`
                }
            ],
            dependencies: [],
            devDependencies: [],
            scripts: {
                start: 'node src/index.js'
            },
            postInstallCommands: []
        };
    }

    private async createFolderStructure(structure: FolderStructure[], basePath: string): Promise<void> {
        for (const item of structure) {
            const itemPath = path.join(basePath, item.name);

            if (item.type === 'folder') {
                if (!fs.existsSync(itemPath)) {
                    fs.mkdirSync(itemPath, { recursive: true });
                }

                if (item.children) {
                    await this.createFolderStructure(item.children, itemPath);
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

    private async createProjectConfig(scaffold: ProjectScaffold, projectPath: string): Promise<void> {
        // Create package.json for Node.js projects
        if (scaffold.dependencies.length > 0 || scaffold.devDependencies.length > 0 || Object.keys(scaffold.scripts).length > 0) {
            const packageJson = {
                name: scaffold.name,
                version: '1.0.0',
                description: scaffold.description,
                scripts: scaffold.scripts,
                dependencies: this.arrayToObject(scaffold.dependencies),
                devDependencies: this.arrayToObject(scaffold.devDependencies)
            };

            const packagePath = path.join(projectPath, 'package.json');
            fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
        }

        // Create .gitignore
        const gitignorePath = path.join(projectPath, '.gitignore');
        const gitignoreContent = this.generateGitignore(scaffold);
        fs.writeFileSync(gitignorePath, gitignoreContent);
    }

    private analyzeFileName(fileName: string): { name: string; extension: string; type: string } {
        const parsed = path.parse(fileName);
        const extension = parsed.ext || this.guessExtension(parsed.name);
        const type = this.getFileType(extension);

        return {
            name: parsed.name,
            extension: extension,
            type: type
        };
    }

    private guessExtension(fileName: string): string {
        const lowerName = fileName.toLowerCase();
        
        // Common patterns
        if (lowerName.includes('component') || lowerName.includes('page')) return '.tsx';
        if (lowerName.includes('service') || lowerName.includes('api')) return '.ts';
        if (lowerName.includes('style') || lowerName.includes('css')) return '.css';
        if (lowerName.includes('test') || lowerName.includes('spec')) return '.test.ts';
        if (lowerName.includes('config')) return '.json';
        if (lowerName === 'readme') return '.md';
        if (lowerName.includes('model') || lowerName.includes('schema')) return '.ts';
        if (lowerName.includes('controller')) return '.ts';
        if (lowerName.includes('middleware')) return '.ts';
        if (lowerName.includes('util') || lowerName.includes('helper')) return '.ts';

        return '.js'; // Default
    }

    private getFileType(extension: string): string {
        const typeMap: { [key: string]: string } = {
            '.ts': 'typescript',
            '.tsx': 'react-component',
            '.js': 'javascript',
            '.jsx': 'react-component',
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
            '.scala': 'scala',
            '.html': 'html',
            '.css': 'css',
            '.scss': 'scss',
            '.less': 'less',
            '.json': 'json',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.xml': 'xml',
            '.sql': 'sql',
            '.md': 'markdown',
            '.sh': 'shell',
            '.ps1': 'powershell',
            '.dockerfile': 'dockerfile'
        };

        return typeMap[extension.toLowerCase()] || 'text';
    }

    private async analyzeProjectContext(contextPath: string): Promise<any> {
        const context: any = {
            projectType: 'unknown',
            framework: 'none',
            language: 'javascript',
            hasPackageJson: false,
            dependencies: [],
            structure: []
        };

        try {
            // Check for package.json
            const packageJsonPath = path.join(contextPath, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                context.hasPackageJson = true;
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                context.dependencies = Object.keys(packageJson.dependencies || {});
                
                // Detect framework
                if (context.dependencies.includes('react')) context.framework = 'react';
                else if (context.dependencies.includes('vue')) context.framework = 'vue';
                else if (context.dependencies.includes('angular')) context.framework = 'angular';
                else if (context.dependencies.includes('express')) context.framework = 'express';
                else if (context.dependencies.includes('fastify')) context.framework = 'fastify';
                else if (context.dependencies.includes('next')) context.framework = 'nextjs';
                else if (context.dependencies.includes('nuxt')) context.framework = 'nuxtjs';
            }

            // Check for TypeScript
            const tsConfigPath = path.join(contextPath, 'tsconfig.json');
            if (fs.existsSync(tsConfigPath)) {
                context.language = 'typescript';
            }

            // Analyze folder structure
            const items = fs.readdirSync(contextPath);
            context.structure = items.filter(item => !item.startsWith('.') && item !== 'node_modules');

        } catch (error) {
            console.error('Error analyzing project context:', error);
        }

        return context;
    }

    private cleanCodeResponse(response: string): string {
        // Remove markdown code blocks
        const codeBlockRegex = /```[\w]*\n?([\s\S]*?)\n?```/g;
        const match = codeBlockRegex.exec(response);
        
        if (match && match[1]) {
            return match[1].trim();
        }
        
        return response.trim();
    }

    private getFallbackContent(fileName: string, extension: string): string {
        const name = path.parse(fileName).name;
        const className = this.toPascalCase(name);

        switch (extension.toLowerCase()) {
            case '.ts':
                return `// ${name} module\n\nexport class ${className} {\n  constructor() {\n    // TODO: Implement constructor\n  }\n}\n`;
            case '.tsx':
                return `import React from 'react';\n\ninterface ${className}Props {\n  // TODO: Define props\n}\n\nconst ${className}: React.FC<${className}Props> = (props) => {\n  return (\n    <div>\n      <h1>${className}</h1>\n      {/* TODO: Implement component */}\n    </div>\n  );\n};\n\nexport default ${className};\n`;
            case '.js':
                return `// ${name} module\n\nclass ${className} {\n  constructor() {\n    // TODO: Implement constructor\n  }\n}\n\nmodule.exports = ${className};\n`;
            case '.jsx':
                return `import React from 'react';\n\nconst ${className} = (props) => {\n  return (\n    <div>\n      <h1>${className}</h1>\n      {/* TODO: Implement component */}\n    </div>\n  );\n};\n\nexport default ${className};\n`;
            case '.css':
                return `/* ${name} styles */\n\n.${name.toLowerCase()} {\n  /* TODO: Add styles */\n}\n`;
            case '.md':
                return `# ${className}\n\nDescription of ${name}.\n\n## Usage\n\nTODO: Add usage instructions.\n`;
            case '.json':
                return `{\n  "name": "${name}",\n  "description": "TODO: Add description"\n}\n`;
            default:
                return `// ${name}\n// TODO: Implement ${name}\n`;
        }
    }

    private findTemplate(templateName: string): FileTemplate | undefined {
        for (const templates of this.templates.values()) {
            const template = templates.find(t => t.name === templateName);
            if (template) return template;
        }
        return undefined;
    }

    private toPascalCase(str: string): string {
        return str.replace(/(?:^|[-_])(\w)/g, (_, char) => char.toUpperCase());
    }

    private arrayToObject(arr: string[]): { [key: string]: string } {
        const obj: { [key: string]: string } = {};
        arr.forEach(item => {
            obj[item] = 'latest';
        });
        return obj;
    }

    private generateGitignore(scaffold: ProjectScaffold): string {
        let gitignore = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production builds
dist/
build/
out/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Temporary folders
tmp/
temp/
`;

        // Add language-specific ignores
        if (scaffold.dependencies.some(dep => dep.includes('python'))) {
            gitignore += `
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
.venv/
pip-log.txt
pip-delete-this-directory.txt
`;
        }

        if (scaffold.dependencies.some(dep => dep.includes('java'))) {
            gitignore += `
# Java
*.class
*.jar
*.war
*.ear
target/
`;
        }

        return gitignore;
    }

    private initializeTemplates(): void {
        // React Templates
        this.templates.set('react', [
            {
                name: 'React Component',
                extension: '.tsx',
                category: 'react',
                description: 'Functional React component with TypeScript',
                content: `import React from 'react';

interface {{className}}Props {
  // TODO: Define props
}

const {{className}}: React.FC<{{className}}Props> = (props) => {
  return (
    <div className="{{fileName}}">
      <h1>{{className}}</h1>
      {/* TODO: Implement component */}
    </div>
  );
};

export default {{className}};`
            },
            {
                name: 'React Hook',
                extension: '.ts',
                category: 'react',
                description: 'Custom React hook',
                content: `import { useState, useEffect } from 'react';

export const use{{className}} = () => {
  const [state, setState] = useState(null);

  useEffect(() => {
    // TODO: Implement hook logic
  }, []);

  return {
    state,
    setState
  };
};`
            }
        ]);

        // Node.js Templates
        this.templates.set('nodejs', [
            {
                name: 'Express Controller',
                extension: '.ts',
                category: 'nodejs',
                description: 'Express.js controller',
                content: `import { Request, Response } from 'express';

export class {{className}}Controller {
  public async getAll(req: Request, res: Response): Promise<void> {
    try {
      // TODO: Implement get all logic
      res.json({ message: 'Get all {{fileName}}' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      // TODO: Implement get by id logic
      res.json({ message: \`Get {{fileName}} by id: \${id}\` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  public async create(req: Request, res: Response): Promise<void> {
    try {
      // TODO: Implement create logic
      res.status(201).json({ message: 'Create {{fileName}}' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  public async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      // TODO: Implement update logic
      res.json({ message: \`Update {{fileName}} with id: \${id}\` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  public async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      // TODO: Implement delete logic
      res.json({ message: \`Delete {{fileName}} with id: \${id}\` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}`
            },
            {
                name: 'Express Service',
                extension: '.ts',
                category: 'nodejs',
                description: 'Service layer class',
                content: `export class {{className}}Service {
  constructor() {
    // TODO: Initialize service dependencies
  }

  public async findAll(): Promise<any[]> {
    try {
      // TODO: Implement find all logic
      return [];
    } catch (error) {
      throw new Error(\`Error finding all {{fileName}}: \${error.message}\`);
    }
  }

  public async findById(id: string): Promise<any> {
    try {
      // TODO: Implement find by id logic
      return null;
    } catch (error) {
      throw new Error(\`Error finding {{fileName}} by id: \${error.message}\`);
    }
  }

  public async create(data: any): Promise<any> {
    try {
      // TODO: Implement create logic
      return data;
    } catch (error) {
      throw new Error(\`Error creating {{fileName}}: \${error.message}\`);
    }
  }

  public async update(id: string, data: any): Promise<any> {
    try {
      // TODO: Implement update logic
      return data;
    } catch (error) {
      throw new Error(\`Error updating {{fileName}}: \${error.message}\`);
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      // TODO: Implement delete logic
    } catch (error) {
      throw new Error(\`Error deleting {{fileName}}: \${error.message}\`);
    }
  }
}`
            }
        ]);

        // Python Templates
        this.templates.set('python', [
            {
                name: 'Python Class',
                extension: '.py',
                category: 'python',
                description: 'Python class with methods',
                content: `"""
{{className}} module
Created on {{date}}
"""

class {{className}}:
    """{{className}} class description."""
    
    def __init__(self):
        """Initialize {{className}}."""
        # TODO: Implement initialization
        pass
    
    def __str__(self):
        """String representation of {{className}}."""
        return f"{{className}}()"
    
    def __repr__(self):
        """Developer representation of {{className}}."""
        return self.__str__()`
            },
            {
                name: 'Flask Route',
                extension: '.py',
                category: 'python',
                description: 'Flask route handler',
                content: `"""
{{className}} routes
Created on {{date}}
"""

from flask import Blueprint, request, jsonify

{{fileName}}_bp = Blueprint('{{fileName}}', __name__)

@{{fileName}}_bp.route('/{{fileName}}', methods=['GET'])
def get_all_{{fileName}}():
    """Get all {{fileName}}."""
    try:
        # TODO: Implement get all logic
        return jsonify({'message': 'Get all {{fileName}}'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@{{fileName}}_bp.route('/{{fileName}}/<int:id>', methods=['GET'])
def get_{{fileName}}_by_id(id):
    """Get {{fileName}} by ID."""
    try:
        # TODO: Implement get by id logic
        return jsonify({'message': f'Get {{fileName}} by id: {id}'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@{{fileName}}_bp.route('/{{fileName}}', methods=['POST'])
def create_{{fileName}}():
    """Create new {{fileName}}."""
    try:
        data = request.get_json()
        # TODO: Implement create logic
        return jsonify({'message': 'Create {{fileName}}'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500`
            }
        ]);
    }

    public getAvailableTemplates(): { [category: string]: FileTemplate[] } {
        const result: { [category: string]: FileTemplate[] } = {};
        for (const [category, templates] of this.templates.entries()) {
            result[category] = templates;
        }
        return result;
    }
}