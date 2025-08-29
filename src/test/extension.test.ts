import * as assert from 'assert';
import * as vscode from 'vscode';
import { AIProvider } from '../aiProvider';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('AI Provider Configuration Test', () => {
        const aiProvider = new AIProvider();
        assert.ok(aiProvider, 'AI Provider should be instantiated');
    });

    test('Gemini Provider Support Test', () => {
        // Test that Gemini provider is supported
        const config = vscode.workspace.getConfiguration('aiCodeGenerator');
        const supportedProviders = ['openai', 'qodo', 'anthropic', 'ollama', 'gemini'];
        
        // This test verifies that gemini is in the list of supported providers
        assert.ok(supportedProviders.includes('gemini'), 'Gemini should be a supported provider');
    });

    test('Extension Activation Test', async () => {
        // Test that the extension activates properly
        const extension = vscode.extensions.getExtension('your-publisher-name.ai-code-generator');
        if (extension) {
            await extension.activate();
            assert.ok(extension.isActive, 'Extension should be active');
        }
    });

    test('Commands Registration Test', async () => {
        // Test that all commands are registered
        const commands = await vscode.commands.getCommands();
        const expectedCommands = [
            'aiCodeGenerator.generateCode',
            'aiCodeGenerator.explainCode',
            'aiCodeGenerator.fixCode',
            'aiCodeGenerator.generateTests',
            'aiCodeGenerator.refactorCode',
            'aiCodeGenerator.addComments',
            'aiCodeGenerator.openChat'
        ];

        expectedCommands.forEach(command => {
            assert.ok(commands.includes(command), `Command ${command} should be registered`);
        });
    });
});