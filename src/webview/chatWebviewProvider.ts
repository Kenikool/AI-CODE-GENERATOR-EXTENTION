import * as vscode from 'vscode';
import { AIProvider, AIMessage } from '../aiProvider';

export class ChatWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'aiCodeGenerator.chatView';
    private _view?: vscode.WebviewView;
    private _conversationHistory: AIMessage[] = [];

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _aiProvider: AIProvider
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'sendMessage':
                    await this._handleUserMessage(data.message);
                    break;
                case 'clearChat':
                    this._clearConversation();
                    break;
                case 'insertCode':
                    await this._insertCodeIntoEditor(data.code);
                    break;
            }
        });
    }

    private async _handleUserMessage(message: string) {
        if (!this._view) {
            return;
        }

        // Add user message to conversation
        this._conversationHistory.push({ role: 'user', content: message });

        // Show user message in chat
        this._view.webview.postMessage({
            type: 'addMessage',
            message: {
                role: 'user',
                content: message,
                timestamp: new Date().toLocaleTimeString()
            }
        });

        // Show typing indicator
        this._view.webview.postMessage({ type: 'showTyping' });

        try {
            // Get AI response
            const systemMessage: AIMessage = {
                role: 'system',
                content: `You are an AI coding assistant. Help the user with code generation, explanation, debugging, and general programming questions. 
                
When providing code examples:
1. Use proper syntax highlighting by specifying the language
2. Provide clear explanations
3. Include comments when helpful
4. Suggest best practices

If the user asks for code to be inserted into their editor, format it properly and mention that they can click the "Insert Code" button.`
            };

            const messages = [systemMessage, ...this._conversationHistory];
            const response = await this._aiProvider.generateResponse(messages);

            // Add AI response to conversation
            this._conversationHistory.push({ role: 'assistant', content: response.content });

            // Hide typing indicator and show response
            this._view.webview.postMessage({ type: 'hideTyping' });
            this._view.webview.postMessage({
                type: 'addMessage',
                message: {
                    role: 'assistant',
                    content: response.content,
                    timestamp: new Date().toLocaleTimeString(),
                    hasCode: this._containsCode(response.content)
                }
            });

        } catch (error) {
            this._view.webview.postMessage({ type: 'hideTyping' });
            this._view.webview.postMessage({
                type: 'addMessage',
                message: {
                    role: 'error',
                    content: `Error: ${error}`,
                    timestamp: new Date().toLocaleTimeString()
                }
            });
        }
    }

    private _clearConversation() {
        this._conversationHistory = [];
        if (this._view) {
            this._view.webview.postMessage({ type: 'clearMessages' });
        }
    }

    private async _insertCodeIntoEditor(code: string) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found');
            return;
        }

        const position = editor.selection.active;
        await editor.edit(editBuilder => {
            editBuilder.insert(position, code);
        });

        vscode.window.showInformationMessage('Code inserted successfully!');
    }

    private _containsCode(content: string): boolean {
        return /```[\s\S]*?```/.test(content) || /`[^`]+`/.test(content);
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Code Assistant</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 0;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .chat-container {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .message {
            padding: 8px 12px;
            border-radius: 8px;
            max-width: 90%;
            word-wrap: break-word;
        }

        .message.user {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            align-self: flex-end;
        }

        .message.assistant {
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            align-self: flex-start;
        }

        .message.error {
            background-color: var(--vscode-inputValidation-errorBackground);
            border-left: 4px solid var(--vscode-inputValidation-errorBorder);
            align-self: flex-start;
        }

        .message-header {
            font-size: 0.8em;
            opacity: 0.7;
            margin-bottom: 4px;
        }

        .message-content {
            line-height: 1.4;
        }

        .message-content pre {
            background-color: var(--vscode-textPreformat-background);
            padding: 8px;
            border-radius: 4px;
            overflow-x: auto;
            margin: 8px 0;
        }

        .message-content code {
            background-color: var(--vscode-textPreformat-background);
            padding: 2px 4px;
            border-radius: 2px;
            font-family: var(--vscode-editor-font-family);
        }

        .code-actions {
            margin-top: 8px;
            display: flex;
            gap: 8px;
        }

        .code-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8em;
        }

        .code-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .input-container {
            padding: 10px;
            border-top: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 8px;
        }

        .message-input {
            flex: 1;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            padding: 8px;
            font-family: var(--vscode-font-family);
            resize: vertical;
            min-height: 20px;
            max-height: 100px;
        }

        .send-button, .clear-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            padding: 8px 12px;
            cursor: pointer;
            white-space: nowrap;
        }

        .send-button:hover, .clear-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .send-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .typing-indicator {
            display: none;
            padding: 8px 12px;
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            border-radius: 8px;
            align-self: flex-start;
            font-style: italic;
            opacity: 0.7;
        }

        .typing-indicator.show {
            display: block;
        }

        .welcome-message {
            text-align: center;
            padding: 20px;
            opacity: 0.7;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="chat-container" id="chatContainer">
        <div class="welcome-message">
            👋 Hi! I'm your AI coding assistant. Ask me anything about code generation, debugging, or programming concepts!
        </div>
        <div class="typing-indicator" id="typingIndicator">AI is thinking...</div>
    </div>
    
    <div class="input-container">
        <textarea 
            class="message-input" 
            id="messageInput" 
            placeholder="Ask me to generate code, explain concepts, fix bugs..."
            rows="1"
        ></textarea>
        <button class="send-button" id="sendButton">Send</button>
        <button class="clear-button" id="clearButton">Clear</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const chatContainer = document.getElementById('chatContainer');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const clearButton = document.getElementById('clearButton');
        const typingIndicator = document.getElementById('typingIndicator');

        // Auto-resize textarea
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 100) + 'px';
        });

        // Send message on Enter (Shift+Enter for new line)
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        sendButton.addEventListener('click', sendMessage);
        clearButton.addEventListener('click', clearChat);

        function sendMessage() {
            const message = messageInput.value.trim();
            if (!message) return;

            vscode.postMessage({
                type: 'sendMessage',
                message: message
            });

            messageInput.value = '';
            messageInput.style.height = 'auto';
            sendButton.disabled = true;
        }

        function clearChat() {
            vscode.postMessage({ type: 'clearChat' });
        }

        function insertCode(code) {
            vscode.postMessage({
                type: 'insertCode',
                code: code
            });
        }

        function extractCodeFromMessage(content) {
            const codeBlockRegex = /\`\`\`[\\w]*\\n?([\\s\\S]*?)\\n?\`\`\`/g;
            const match = codeBlockRegex.exec(content);
            return match ? match[1].trim() : content;
        }

        function formatMessageContent(content) {
            // Convert markdown-style code blocks to HTML
            content = content.replace(/\`\`\`(\\w+)?\\n?([\\s\\S]*?)\\n?\`\`\`/g, '<pre><code>$2</code></pre>');
            // Convert inline code
            content = content.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
            // Convert line breaks
            content = content.replace(/\\n/g, '<br>');
            return content;
        }

        // Listen for messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'addMessage':
                    addMessage(message.message);
                    break;
                case 'clearMessages':
                    clearMessages();
                    break;
                case 'showTyping':
                    showTyping();
                    break;
                case 'hideTyping':
                    hideTyping();
                    break;
            }
        });

        function addMessage(message) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${message.role}\`;
            
            const headerDiv = document.createElement('div');
            headerDiv.className = 'message-header';
            headerDiv.textContent = \`\${message.role === 'user' ? 'You' : message.role === 'error' ? 'Error' : 'AI Assistant'} • \${message.timestamp}\`;
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.innerHTML = formatMessageContent(message.content);
            
            messageDiv.appendChild(headerDiv);
            messageDiv.appendChild(contentDiv);
            
            // Add code insertion button if message contains code
            if (message.hasCode && message.role === 'assistant') {
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'code-actions';
                
                const insertButton = document.createElement('button');
                insertButton.className = 'code-button';
                insertButton.textContent = 'Insert Code';
                insertButton.onclick = () => {
                    const code = extractCodeFromMessage(message.content);
                    insertCode(code);
                };
                
                actionsDiv.appendChild(insertButton);
                messageDiv.appendChild(actionsDiv);
            }
            
            // Remove welcome message if it exists
            const welcomeMessage = chatContainer.querySelector('.welcome-message');
            if (welcomeMessage) {
                welcomeMessage.remove();
            }
            
            chatContainer.insertBefore(messageDiv, typingIndicator);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            
            sendButton.disabled = false;
        }

        function clearMessages() {
            const messages = chatContainer.querySelectorAll('.message');
            messages.forEach(msg => msg.remove());
            
            // Add welcome message back
            const welcomeDiv = document.createElement('div');
            welcomeDiv.className = 'welcome-message';
            welcomeDiv.textContent = '👋 Hi! I\\'m your AI coding assistant. Ask me anything about code generation, debugging, or programming concepts!';
            chatContainer.insertBefore(welcomeDiv, typingIndicator);
        }

        function showTyping() {
            typingIndicator.classList.add('show');
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        function hideTyping() {
            typingIndicator.classList.remove('show');
        }
    </script>
</body>
</html>`;
    }
}