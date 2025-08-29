import * as vscode from 'vscode';
import axios from 'axios';
import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AIResponse {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export class AIProvider {
    private openaiClient?: OpenAI;
    private geminiClient?: GoogleGenerativeAI;
    private config: vscode.WorkspaceConfiguration;

    constructor() {
        this.config = vscode.workspace.getConfiguration('aiCodeGenerator');
        this.initializeProviders();
    }

    private initializeProviders() {
        const provider = this.config.get<string>('provider', 'gemini');
        
        if (provider === 'openai') {
            const apiKey = this.config.get<string>('openai.apiKey');
            if (apiKey) {
                this.openaiClient = new OpenAI({ apiKey });
            }
        } else if (provider === 'gemini') {
            const apiKey = this.config.get<string>('gemini.apiKey');
            if (apiKey) {
                this.geminiClient = new GoogleGenerativeAI(apiKey);
            }
        }
    }

    public updateConfiguration() {
        this.config = vscode.workspace.getConfiguration('aiCodeGenerator');
        this.initializeProviders();
    }

    public async generateResponse(
        messages: AIMessage[],
        cancellationToken?: vscode.CancellationToken
    ): Promise<AIResponse> {
        const provider = this.config.get<string>('provider', 'gemini');

        switch (provider) {
            case 'openai':
                return this.generateOpenAIResponse(messages, cancellationToken);
            case 'qodo':
                return this.generateQodoResponse(messages, cancellationToken);
            case 'anthropic':
                return this.generateAnthropicResponse(messages, cancellationToken);
            case 'ollama':
                return this.generateOllamaResponse(messages, cancellationToken);
            case 'gemini':
                return this.generateGeminiResponse(messages, cancellationToken);
            default:
                throw new Error(`Unsupported AI provider: ${provider}`);
        }
    }

    private async generateOpenAIResponse(
        messages: AIMessage[],
        cancellationToken?: vscode.CancellationToken
    ): Promise<AIResponse> {
        if (!this.openaiClient) {
            throw new Error('OpenAI API key not configured. Please set it in settings.');
        }

        const model = this.config.get<string>('openai.model', 'gpt-3.5-turbo');
        const maxTokens = this.config.get<number>('maxTokens', 2048);
        const temperature = this.config.get<number>('temperature', 0.7);

        try {
            const response = await this.openaiClient.chat.completions.create({
                model,
                messages: messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                max_tokens: maxTokens,
                temperature,
                stream: false
            });

            if (cancellationToken?.isCancellationRequested) {
                throw new Error('Request cancelled');
            }

            const choice = response.choices[0];
            if (!choice?.message?.content) {
                throw new Error('No response content received');
            }

            return {
                content: choice.message.content,
                usage: response.usage ? {
                    promptTokens: response.usage.prompt_tokens,
                    completionTokens: response.usage.completion_tokens,
                    totalTokens: response.usage.total_tokens
                } : undefined
            };
        } catch (error: any) {
            if (error.code === 'insufficient_quota') {
                throw new Error('OpenAI API quota exceeded. Please check your billing.');
            } else if (error.code === 'invalid_api_key') {
                throw new Error('Invalid OpenAI API key. Please check your configuration.');
            }
            throw new Error(`OpenAI API error: ${error.message}`);
        }
    }

    private async generateQodoResponse(
        messages: AIMessage[],
        cancellationToken?: vscode.CancellationToken
    ): Promise<AIResponse> {
        const apiKey = this.config.get<string>('qodo.apiKey');
        const endpoint = this.config.get<string>('qodo.endpoint', 'https://api.qodo.ai');
        
        if (!apiKey) {
            throw new Error('Qodo API key not configured. Please set it in settings.');
        }

        const maxTokens = this.config.get<number>('maxTokens', 2048);
        const temperature = this.config.get<number>('temperature', 0.7);

        try {
            const response = await axios.post(
                `${endpoint}/v1/chat/completions`,
                {
                    messages,
                    max_tokens: maxTokens,
                    temperature,
                    stream: false
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            if (cancellationToken?.isCancellationRequested) {
                throw new Error('Request cancelled');
            }

            const choice = response.data.choices[0];
            if (!choice?.message?.content) {
                throw new Error('No response content received');
            }

            return {
                content: choice.message.content,
                usage: response.data.usage ? {
                    promptTokens: response.data.usage.prompt_tokens,
                    completionTokens: response.data.usage.completion_tokens,
                    totalTokens: response.data.usage.total_tokens
                } : undefined
            };
        } catch (error: any) {
            if (error.response?.status === 401) {
                throw new Error('Invalid Qodo API key. Please check your configuration.');
            } else if (error.response?.status === 429) {
                throw new Error('Qodo API rate limit exceeded. Please try again later.');
            }
            throw new Error(`Qodo API error: ${error.message}`);
        }
    }

    private async generateAnthropicResponse(
        messages: AIMessage[],
        cancellationToken?: vscode.CancellationToken
    ): Promise<AIResponse> {
        const apiKey = this.config.get<string>('anthropic.apiKey');
        const model = this.config.get<string>('anthropic.model', 'claude-3-sonnet-20240229');
        
        if (!apiKey) {
            throw new Error('Anthropic API key not configured. Please set it in settings.');
        }

        const maxTokens = this.config.get<number>('maxTokens', 2048);
        const temperature = this.config.get<number>('temperature', 0.7);

        try {
            // Convert messages to Anthropic format
            const systemMessage = messages.find(m => m.role === 'system');
            const conversationMessages = messages.filter(m => m.role !== 'system');

            const response = await axios.post(
                'https://api.anthropic.com/v1/messages',
                {
                    model,
                    max_tokens: maxTokens,
                    temperature,
                    system: systemMessage?.content,
                    messages: conversationMessages.map(msg => ({
                        role: msg.role === 'assistant' ? 'assistant' : 'user',
                        content: msg.content
                    }))
                },
                {
                    headers: {
                        'x-api-key': apiKey,
                        'Content-Type': 'application/json',
                        'anthropic-version': '2023-06-01'
                    },
                    timeout: 30000
                }
            );

            if (cancellationToken?.isCancellationRequested) {
                throw new Error('Request cancelled');
            }

            const content = response.data.content[0]?.text;
            if (!content) {
                throw new Error('No response content received');
            }

            return {
                content,
                usage: response.data.usage ? {
                    promptTokens: response.data.usage.input_tokens,
                    completionTokens: response.data.usage.output_tokens,
                    totalTokens: response.data.usage.input_tokens + response.data.usage.output_tokens
                } : undefined
            };
        } catch (error: any) {
            if (error.response?.status === 401) {
                throw new Error('Invalid Anthropic API key. Please check your configuration.');
            } else if (error.response?.status === 429) {
                throw new Error('Anthropic API rate limit exceeded. Please try again later.');
            }
            throw new Error(`Anthropic API error: ${error.message}`);
        }
    }

    private async generateOllamaResponse(
        messages: AIMessage[],
        cancellationToken?: vscode.CancellationToken
    ): Promise<AIResponse> {
        const endpoint = this.config.get<string>('ollama.endpoint', 'http://localhost:11434');
        const model = this.config.get<string>('ollama.model', 'codellama');
        const temperature = this.config.get<number>('temperature', 0.7);

        try {
            const response = await axios.post(
                `${endpoint}/api/chat`,
                {
                    model,
                    messages,
                    stream: false,
                    options: {
                        temperature
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000 // Ollama can be slower
                }
            );

            if (cancellationToken?.isCancellationRequested) {
                throw new Error('Request cancelled');
            }

            const content = response.data.message?.content;
            if (!content) {
                throw new Error('No response content received');
            }

            return {
                content
            };
        } catch (error: any) {
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Cannot connect to Ollama. Please ensure Ollama is running.');
            }
            throw new Error(`Ollama API error: ${error.message}`);
        }
    }

    private async generateGeminiResponse(
        messages: AIMessage[],
        cancellationToken?: vscode.CancellationToken
    ): Promise<AIResponse> {
        if (!this.geminiClient) {
            throw new Error('Google AI API key not configured. Please set it in settings.');
        }

        const model = this.config.get<string>('gemini.model', 'gemini-1.5-flash');
        const temperature = this.config.get<number>('temperature', 0.7);
        const maxTokens = this.config.get<number>('maxTokens', 2048);

        try {
            const genModel = this.geminiClient.getGenerativeModel({ 
                model,
                generationConfig: {
                    temperature,
                    maxOutputTokens: maxTokens
                }
            });

            // Convert messages to Gemini format
            const systemMessage = messages.find(m => m.role === 'system');
            const conversationMessages = messages.filter(m => m.role !== 'system');

            if (conversationMessages.length === 0) {
                throw new Error('No user messages found');
            }

            // For single message (most common case in code generation)
            if (conversationMessages.length === 1 && conversationMessages[0].role === 'user') {
                let prompt = conversationMessages[0].content;
                
                // Prepend system message if exists
                if (systemMessage) {
                    prompt = `${systemMessage.content}\n\n${prompt}`;
                }

                const result = await genModel.generateContent(prompt);
                
                if (cancellationToken?.isCancellationRequested) {
                    throw new Error('Request cancelled');
                }

                const response = await result.response;
                const content = response.text();

                if (!content) {
                    throw new Error('No response content received');
                }

                return {
                    content,
                    usage: {
                        promptTokens: 0, // Gemini doesn't provide token counts in the same way
                        completionTokens: 0,
                        totalTokens: 0
                    }
                };
            } else {
                // For multi-turn conversations, use chat
                const history = [];
                
                // Convert conversation to Gemini format
                for (let i = 0; i < conversationMessages.length - 1; i++) {
                    const msg = conversationMessages[i];
                    history.push({
                        role: msg.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: msg.content }]
                    });
                }

                const chat = genModel.startChat({
                    history,
                    generationConfig: {
                        temperature,
                        maxOutputTokens: maxTokens
                    }
                });

                const lastMessage = conversationMessages[conversationMessages.length - 1];
                let prompt = lastMessage.content;
                
                // Prepend system message to the last user message if exists
                if (systemMessage && lastMessage.role === 'user') {
                    prompt = `${systemMessage.content}\n\n${prompt}`;
                }

                const result = await chat.sendMessage(prompt);
                
                if (cancellationToken?.isCancellationRequested) {
                    throw new Error('Request cancelled');
                }

                const response = await result.response;
                const content = response.text();

                if (!content) {
                    throw new Error('No response content received');
                }

                return {
                    content,
                    usage: {
                        promptTokens: 0,
                        completionTokens: 0,
                        totalTokens: 0
                    }
                };
            }
        } catch (error: any) {
            if (error.message?.includes('API_KEY_INVALID')) {
                throw new Error('Invalid Google AI API key. Please check your configuration.');
            } else if (error.message?.includes('QUOTA_EXCEEDED')) {
                throw new Error('Google AI API quota exceeded. Please check your billing.');
            } else if (error.message?.includes('RATE_LIMIT_EXCEEDED')) {
                throw new Error('Google AI API rate limit exceeded. Please try again later.');
            }
            throw new Error(`Google AI API error: ${error.message}`);
        }
    }

    public async testConnection(): Promise<boolean> {
        try {
            const testMessages: AIMessage[] = [
                { role: 'user', content: 'Hello, can you respond with just "OK"?' }
            ];
            
            const response = await this.generateResponse(testMessages);
            return response.content.length > 0;
        } catch (error) {
            return false;
        }
    }
}