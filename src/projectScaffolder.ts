import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AIProvider, AIMessage } from './aiProvider';
import { FileSystemManager } from './fileSystemManager';
import { TerminalManager } from './terminalManager';

export interface ScaffoldTemplate {
    name: string;
    description: string;
    category: string;
    tags: string[];
    structure: any;
    dependencies: string[];
    devDependencies: string[];
    scripts: { [key: string]: string };
    postSetupCommands: string[];
    features: string[];
}

export interface CustomScaffold {
    projectName: string;
    projectType: string;
    features: string[];
    structure: any;
    setup: {
        dependencies: string[];
        devDependencies: string[];
        scripts: { [key: string]: string };
        commands: string[];
        configFiles: { [fileName: string]: string };
    };
}

export class ProjectScaffolder {
    private templates: Map<string, ScaffoldTemplate> = new Map();

    constructor(
        private aiProvider: AIProvider,
        private fileSystemManager: FileSystemManager,
        private terminalManager: TerminalManager
    ) {
        this.initializeTemplates();
    }

    public async createFullProject(
        description: string,
        projectName: string,
        targetPath: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<void> {
        try {
            vscode.window.showInformationMessage(`🚀 Creating project: ${projectName}...`);

            // Generate custom scaffold using AI
            const scaffold = await this.generateCustomScaffold(
                description,
                projectName,
                cancellationToken
            );

            // Create project directory
            const projectPath = path.join(targetPath, projectName);
            if (!fs.existsSync(projectPath)) {
                fs.mkdirSync(projectPath, { recursive: true });
            }

            // Create file structure
            await this.createProjectStructure(scaffold.structure, projectPath);

            // Create configuration files
            await this.createConfigurationFiles(scaffold.setup.configFiles, projectPath);

            // Create package.json or equivalent
            await this.createProjectManifest(scaffold, projectPath);

            // Install dependencies
            if (scaffold.setup.dependencies.length > 0 || scaffold.setup.devDependencies.length > 0) {
                await this.installProjectDependencies(scaffold, projectPath, cancellationToken);
            }

            // Run setup commands
            if (scaffold.setup.commands.length > 0) {
                await this.runSetupCommands(scaffold.setup.commands, projectPath);
            }

            // Open project in new window
            const projectUri = vscode.Uri.file(projectPath);
            await vscode.commands.executeCommand('vscode.openFolder', projectUri, true);

            vscode.window.showInformationMessage(`✅ Project ${projectName} created successfully!`);

        } catch (error) {
            vscode.window.showErrorMessage(`Error creating project: ${error}`);
        }
    }

    public async createFromTemplate(
        templateName: string,
        projectName: string,
        targetPath: string,
        customizations?: { [key: string]: string },
        cancellationToken?: vscode.CancellationToken
    ): Promise<void> {
        try {
            const template = this.templates.get(templateName);
            if (!template) {
                throw new Error(`Template ${templateName} not found`);
            }

            vscode.window.showInformationMessage(`🚀 Creating ${template.name} project: ${projectName}...`);

            const projectPath = path.join(targetPath, projectName);
            if (!fs.existsSync(projectPath)) {
                fs.mkdirSync(projectPath, { recursive: true });
            }

            // Create structure from template
            await this.createProjectStructure(template.structure, projectPath, customizations);

            // Create package.json
            const packageJson = {
                name: projectName,
                version: '1.0.0',
                description: template.description,
                scripts: template.scripts,
                dependencies: this.arrayToObject(template.dependencies),
                devDependencies: this.arrayToObject(template.devDependencies)
            };

            fs.writeFileSync(
                path.join(projectPath, 'package.json'),
                JSON.stringify(packageJson, null, 2)
            );

            // Install dependencies
            if (template.dependencies.length > 0) {
                await this.terminalManager.installDependencies(
                    template.dependencies,
                    false,
                    undefined,
                    cancellationToken
                );
            }

            if (template.devDependencies.length > 0) {
                await this.terminalManager.installDependencies(
                    template.devDependencies,
                    true,
                    undefined,
                    cancellationToken
                );
            }

            // Run post-setup commands
            for (const command of template.postSetupCommands) {
                await this.terminalManager.executeInTerminal(command, 'Project Setup', projectPath, false);
            }

            // Open project
            const projectUri = vscode.Uri.file(projectPath);
            await vscode.commands.executeCommand('vscode.openFolder', projectUri, true);

            vscode.window.showInformationMessage(`✅ ${template.name} project created successfully!`);

        } catch (error) {
            vscode.window.showErrorMessage(`Error creating project from template: ${error}`);
        }
    }

    public async createAdvancedStructure(
        structureType: string,
        targetPath: string,
        options?: { [key: string]: any },
        cancellationToken?: vscode.CancellationToken
    ): Promise<void> {
        try {
            // Generate advanced structure using AI
            const structure = await this.generateAdvancedStructure(
                structureType,
                options || {},
                cancellationToken
            );

            // Create the structure
            await this.createProjectStructure(structure.files, targetPath);

            // Install any recommended dependencies
            if (structure.dependencies && structure.dependencies.length > 0) {
                await this.terminalManager.installDependencies(
                    structure.dependencies,
                    false,
                    undefined,
                    cancellationToken
                );
            }

            vscode.window.showInformationMessage(`✅ Advanced ${structureType} structure created!`);

        } catch (error) {
            vscode.window.showErrorMessage(`Error creating advanced structure: ${error}`);
        }
    }

    public async setupMicroserviceArchitecture(
        services: string[],
        targetPath: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<void> {
        try {
            vscode.window.showInformationMessage(`🏗️ Setting up microservice architecture...`);

            // Create main project directory
            const projectPath = path.join(targetPath, 'microservices-project');
            if (!fs.existsSync(projectPath)) {
                fs.mkdirSync(projectPath, { recursive: true });
            }

            // Generate microservice architecture
            const architecture = await this.generateMicroserviceArchitecture(
                services,
                cancellationToken
            );

            // Create each service
            for (const service of architecture.services) {
                const servicePath = path.join(projectPath, 'services', service.name);
                await this.createProjectStructure(service.structure, servicePath);
                
                // Create service-specific package.json
                const servicePackageJson = {
                    name: service.name,
                    version: '1.0.0',
                    description: service.description,
                    scripts: service.scripts,
                    dependencies: this.arrayToObject(service.dependencies),
                    devDependencies: this.arrayToObject(service.devDependencies)
                };

                fs.writeFileSync(
                    path.join(servicePath, 'package.json'),
                    JSON.stringify(servicePackageJson, null, 2)
                );
            }

            // Create shared infrastructure
            await this.createProjectStructure(architecture.infrastructure, projectPath);

            // Create docker-compose and other orchestration files
            for (const [fileName, content] of Object.entries(architecture.orchestration)) {
                fs.writeFileSync(path.join(projectPath, fileName), content);
            }

            // Create main package.json for workspace
            const mainPackageJson = {
                name: 'microservices-project',
                version: '1.0.0',
                description: 'Microservices architecture project',
                private: true,
                workspaces: services.map(service => `services/${service}`),
                scripts: architecture.scripts,
                devDependencies: this.arrayToObject(architecture.devDependencies)
            };

            fs.writeFileSync(
                path.join(projectPath, 'package.json'),
                JSON.stringify(mainPackageJson, null, 2)
            );

            vscode.window.showInformationMessage(`✅ Microservice architecture created successfully!`);

        } catch (error) {
            vscode.window.showErrorMessage(`Error setting up microservice architecture: ${error}`);
        }
    }

    public async createComponentLibrary(
        libraryName: string,
        framework: string,
        targetPath: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<void> {
        try {
            vscode.window.showInformationMessage(`📚 Creating ${framework} component library: ${libraryName}...`);

            // Generate component library structure
            const library = await this.generateComponentLibrary(
                libraryName,
                framework,
                cancellationToken
            );

            const projectPath = path.join(targetPath, libraryName);
            if (!fs.existsSync(projectPath)) {
                fs.mkdirSync(projectPath, { recursive: true });
            }

            // Create library structure
            await this.createProjectStructure(library.structure, projectPath);

            // Create package.json for library
            const packageJson = {
                name: libraryName,
                version: '0.1.0',
                description: library.description,
                main: library.main,
                module: library.module,
                types: library.types,
                scripts: library.scripts,
                peerDependencies: this.arrayToObject(library.peerDependencies),
                devDependencies: this.arrayToObject(library.devDependencies),
                files: library.files,
                keywords: library.keywords
            };

            fs.writeFileSync(
                path.join(projectPath, 'package.json'),
                JSON.stringify(packageJson, null, 2)
            );

            // Install dev dependencies
            if (library.devDependencies.length > 0) {
                await this.terminalManager.installDependencies(
                    library.devDependencies,
                    true,
                    undefined,
                    cancellationToken
                );
            }

            vscode.window.showInformationMessage(`✅ Component library ${libraryName} created successfully!`);

        } catch (error) {
            vscode.window.showErrorMessage(`Error creating component library: ${error}`);
        }
    }

    private async generateCustomScaffold(
        description: string,
        projectName: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<CustomScaffold> {
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `You are an expert project architect. Generate a complete project scaffold based on the description.

Return a JSON object with this structure:
{
  "projectName": "string",
  "projectType": "string",
  "features": ["feature1", "feature2"],
  "structure": [
    {
      "name": "folder-or-file",
      "type": "folder" or "file",
      "content": "file content (only for files)",
      "children": [] // only for folders
    }
  ],
  "setup": {
    "dependencies": ["package1", "package2"],
    "devDependencies": ["dev-package1", "dev-package2"],
    "scripts": {
      "start": "command",
      "build": "command",
      "test": "command"
    },
    "commands": ["post-install command1", "command2"],
    "configFiles": {
      "filename": "file content"
    }
  }
}

Create a production-ready, well-structured project with:
- Complete folder structure
- All necessary files with proper content
- Appropriate dependencies
- Build and development scripts
- Configuration files
- Documentation
- Testing setup

Follow industry best practices and modern development standards.`
            },
            {
                role: 'user',
                content: `Create a complete project scaffold for:

Description: ${description}
Project Name: ${projectName}

Generate a comprehensive, production-ready project structure with all necessary files, dependencies, and setup.`
            }
        ];

        try {
            const response = await this.aiProvider.generateResponse(messages, cancellationToken);
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.error('Error generating custom scaffold:', error);
        }

        // Fallback scaffold
        return {
            projectName,
            projectType: 'web-application',
            features: ['basic-setup'],
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
                }
            ],
            setup: {
                dependencies: [],
                devDependencies: [],
                scripts: { start: 'node src/index.js' },
                commands: [],
                configFiles: {}
            }
        };
    }

    private async generateAdvancedStructure(
        structureType: string,
        options: { [key: string]: any },
        cancellationToken?: vscode.CancellationToken
    ): Promise<{ files: any[]; dependencies: string[] }> {
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `Generate an advanced project structure for ${structureType}.

Return a JSON object with:
{
  "files": [
    {
      "name": "folder-or-file",
      "type": "folder" or "file",
      "content": "file content",
      "children": []
    }
  ],
  "dependencies": ["package1", "package2"]
}

Create a sophisticated, well-organized structure following best practices.`
            },
            {
                role: 'user',
                content: `Generate advanced ${structureType} structure with options: ${JSON.stringify(options)}`
            }
        ];

        try {
            const response = await this.aiProvider.generateResponse(messages, cancellationToken);
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.error('Error generating advanced structure:', error);
        }

        return { files: [], dependencies: [] };
    }

    private async generateMicroserviceArchitecture(
        services: string[],
        cancellationToken?: vscode.CancellationToken
    ): Promise<any> {
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `Generate a complete microservice architecture with the specified services.

Return a JSON object with:
{
  "services": [
    {
      "name": "service-name",
      "description": "service description",
      "structure": [], // file structure
      "dependencies": [],
      "devDependencies": [],
      "scripts": {}
    }
  ],
  "infrastructure": [], // shared infrastructure files
  "orchestration": {
    "docker-compose.yml": "content",
    "kubernetes.yml": "content"
  },
  "scripts": {},
  "devDependencies": []
}

Include proper service communication, API gateways, databases, and orchestration.`
            },
            {
                role: 'user',
                content: `Generate microservice architecture for services: ${services.join(', ')}`
            }
        ];

        try {
            const response = await this.aiProvider.generateResponse(messages, cancellationToken);
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.error('Error generating microservice architecture:', error);
        }

        return { services: [], infrastructure: [], orchestration: {}, scripts: {}, devDependencies: [] };
    }

    private async generateComponentLibrary(
        libraryName: string,
        framework: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<any> {
        const messages: AIMessage[] = [
            {
                role: 'system',
                content: `Generate a complete component library structure for ${framework}.

Return a JSON object with:
{
  "description": "library description",
  "structure": [], // file structure
  "main": "main entry point",
  "module": "es module entry",
  "types": "typescript definitions",
  "scripts": {},
  "peerDependencies": [],
  "devDependencies": [],
  "files": ["files to include in package"],
  "keywords": ["relevant keywords"]
}

Include build setup, testing, documentation, and publishing configuration.`
            },
            {
                role: 'user',
                content: `Generate ${framework} component library: ${libraryName}`
            }
        ];

        try {
            const response = await this.aiProvider.generateResponse(messages, cancellationToken);
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.error('Error generating component library:', error);
        }

        return {
            description: `A ${framework} component library`,
            structure: [],
            main: 'dist/index.js',
            module: 'dist/index.esm.js',
            types: 'dist/index.d.ts',
            scripts: {},
            peerDependencies: [],
            devDependencies: [],
            files: ['dist'],
            keywords: [framework, 'components', 'library']
        };
    }

    private async createProjectStructure(
        structure: any[],
        basePath: string,
        customizations?: { [key: string]: string }
    ): Promise<void> {
        for (const item of structure) {
            const itemPath = path.join(basePath, item.name);

            if (item.type === 'folder') {
                if (!fs.existsSync(itemPath)) {
                    fs.mkdirSync(itemPath, { recursive: true });
                }

                if (item.children) {
                    await this.createProjectStructure(item.children, itemPath, customizations);
                }
            } else if (item.type === 'file') {
                const dir = path.dirname(itemPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                let content = item.content || '';

                // Apply customizations
                if (customizations) {
                    for (const [key, value] of Object.entries(customizations)) {
                        content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
                    }
                }

                fs.writeFileSync(itemPath, content);
            }
        }
    }

    private async createConfigurationFiles(
        configFiles: { [fileName: string]: string },
        projectPath: string
    ): Promise<void> {
        for (const [fileName, content] of Object.entries(configFiles)) {
            const filePath = path.join(projectPath, fileName);
            const dir = path.dirname(filePath);

            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(filePath, content);
        }
    }

    private async createProjectManifest(
        scaffold: CustomScaffold,
        projectPath: string
    ): Promise<void> {
        const packageJson = {
            name: scaffold.projectName,
            version: '1.0.0',
            description: `A ${scaffold.projectType} project`,
            scripts: scaffold.setup.scripts,
            dependencies: this.arrayToObject(scaffold.setup.dependencies),
            devDependencies: this.arrayToObject(scaffold.setup.devDependencies)
        };

        fs.writeFileSync(
            path.join(projectPath, 'package.json'),
            JSON.stringify(packageJson, null, 2)
        );
    }

    private async installProjectDependencies(
        scaffold: CustomScaffold,
        projectPath: string,
        cancellationToken?: vscode.CancellationToken
    ): Promise<void> {
        // Change to project directory for installation
        process.chdir(projectPath);

        if (scaffold.setup.dependencies.length > 0) {
            await this.terminalManager.installDependencies(
                scaffold.setup.dependencies,
                false,
                undefined,
                cancellationToken
            );
        }

        if (scaffold.setup.devDependencies.length > 0) {
            await this.terminalManager.installDependencies(
                scaffold.setup.devDependencies,
                true,
                undefined,
                cancellationToken
            );
        }
    }

    private async runSetupCommands(
        commands: string[],
        projectPath: string
    ): Promise<void> {
        for (const command of commands) {
            await this.terminalManager.executeInTerminal(
                command,
                'Project Setup',
                projectPath,
                false
            );
        }
    }

    private arrayToObject(arr: string[]): { [key: string]: string } {
        const obj: { [key: string]: string } = {};
        arr.forEach(item => {
            obj[item] = 'latest';
        });
        return obj;
    }

    private initializeTemplates(): void {
        // React Templates
        this.templates.set('react-app', {
            name: 'React Application',
            description: 'Modern React application with TypeScript',
            category: 'frontend',
            tags: ['react', 'typescript', 'frontend'],
            structure: [], // Will be populated by AI
            dependencies: ['react', 'react-dom'],
            devDependencies: ['@types/react', '@types/react-dom', 'typescript', 'vite'],
            scripts: {
                'dev': 'vite',
                'build': 'tsc && vite build',
                'preview': 'vite preview'
            },
            postSetupCommands: [],
            features: ['typescript', 'vite', 'modern-react']
        });

        // Node.js API Template
        this.templates.set('node-api', {
            name: 'Node.js API',
            description: 'RESTful API with Express and TypeScript',
            category: 'backend',
            tags: ['nodejs', 'express', 'api', 'typescript'],
            structure: [],
            dependencies: ['express', 'cors', 'helmet', 'dotenv'],
            devDependencies: ['@types/express', '@types/cors', 'typescript', 'nodemon', 'ts-node'],
            scripts: {
                'start': 'node dist/index.js',
                'dev': 'nodemon src/index.ts',
                'build': 'tsc'
            },
            postSetupCommands: [],
            features: ['express', 'typescript', 'cors', 'security']
        });

        // Add more templates...
    }

    public getAvailableTemplates(): ScaffoldTemplate[] {
        return Array.from(this.templates.values());
    }
}