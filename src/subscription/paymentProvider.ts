import * as vscode from 'vscode';
import { SubscriptionPlan } from './subscriptionManager';

export interface PaymentMethod {
    id: string;
    name: string;
    description: string;
    icon: string;
    supported: boolean;
}

export interface PaymentResult {
    success: boolean;
    transactionId?: string;
    subscriptionId?: string;
    error?: string;
}

export interface PaymentConfig {
    paypal: {
        clientId: string;
        clientSecret: string;
        sandbox: boolean;
    };
    stripe: {
        publishableKey: string;
        secretKey: string;
        webhookSecret: string;
    };
    crypto: {
        bitcoinAddress: string;
        ethereumAddress: string;
        enabled: boolean;
    };
    bank: {
        accountNumber: string;
        routingNumber: string;
        enabled: boolean;
    };
}

export class PaymentProvider {
    private config!: PaymentConfig;
    private paymentMethods: PaymentMethod[] = [];

    constructor() {
        this.initializeConfig();
        this.initializePaymentMethods();
    }

    private initializeConfig() {
        // In a real implementation, these would come from secure configuration
        this.config = {
            paypal: {
                clientId: process.env.PAYPAL_CLIENT_ID || 'demo_client_id',
                clientSecret: process.env.PAYPAL_CLIENT_SECRET || 'demo_secret',
                sandbox: true // Set to false for production
            },
            stripe: {
                publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_demo',
                secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_demo',
                webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_demo'
            },
            crypto: {
                bitcoinAddress: process.env.BITCOIN_ADDRESS || '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
                ethereumAddress: process.env.ETHEREUM_ADDRESS || '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87',
                enabled: true
            },
            bank: {
                accountNumber: process.env.BANK_ACCOUNT || '123456789',
                routingNumber: process.env.BANK_ROUTING || '021000021',
                enabled: true
            }
        };
    }

    private initializePaymentMethods() {
        this.paymentMethods = [
            {
                id: 'paypal',
                name: 'PayPal',
                description: 'Pay securely with PayPal',
                icon: '💳',
                supported: true
            },
            {
                id: 'stripe',
                name: 'Credit/Debit Card',
                description: 'Visa, MasterCard, American Express',
                icon: '💳',
                supported: true
            },
            {
                id: 'bitcoin',
                name: 'Bitcoin',
                description: 'Pay with Bitcoin cryptocurrency',
                icon: '₿',
                supported: this.config.crypto.enabled
            },
            {
                id: 'ethereum',
                name: 'Ethereum',
                description: 'Pay with Ethereum cryptocurrency',
                icon: 'Ξ',
                supported: this.config.crypto.enabled
            },
            {
                id: 'bank',
                name: 'Bank Transfer',
                description: 'Direct bank transfer (ACH)',
                icon: '🏦',
                supported: this.config.bank.enabled
            }
        ];
    }

    public async getAvailablePaymentMethods(): Promise<PaymentMethod[]> {
        return this.paymentMethods.filter(method => method.supported);
    }

    public async processSubscription(
        userId: string,
        plan: SubscriptionPlan,
        paymentMethod: string
    ): Promise<PaymentResult> {
        try {
            switch (paymentMethod) {
                case 'paypal':
                    return await this.processPayPalSubscription(userId, plan);
                case 'stripe':
                    return await this.processStripeSubscription(userId, plan);
                case 'bitcoin':
                    return await this.processCryptoPayment(userId, plan.price.monthly, 'bitcoin');
                case 'ethereum':
                    return await this.processCryptoPayment(userId, plan.price.monthly, 'ethereum');
                case 'bank':
                    return await this.processBankTransfer(userId, plan.price.monthly);
                default:
                    throw new Error(`Unsupported payment method: ${paymentMethod}`);
            }
        } catch (error) {
            return {
                success: false,
                error: `Payment processing failed: ${error}`
            };
        }
    }

    public async processOneTimePayment(
        userId: string,
        amount: number,
        description: string,
        paymentMethod: string
    ): Promise<PaymentResult> {
        try {
            switch (paymentMethod) {
                case 'paypal':
                    return await this.processPayPalPayment(userId, amount, description);
                case 'stripe':
                    return await this.processStripePayment(userId, amount, description);
                case 'bitcoin':
                    return await this.processCryptoPayment(userId, amount, 'bitcoin');
                case 'ethereum':
                    return await this.processCryptoPayment(userId, amount, 'ethereum');
                case 'bank':
                    return await this.processBankTransfer(userId, amount);
                default:
                    throw new Error(`Unsupported payment method: ${paymentMethod}`);
            }
        } catch (error) {
            return {
                success: false,
                error: `Payment processing failed: ${error}`
            };
        }
    }

    private async processPayPalSubscription(userId: string, plan: SubscriptionPlan): Promise<PaymentResult> {
        // In a real implementation, this would integrate with PayPal's subscription API
        try {
            // Simulate PayPal API call
            const paypalResponse = await this.simulatePayPalAPI({
                intent: 'subscription',
                plan_id: plan.id,
                subscriber: {
                    name: { given_name: 'User', surname: userId },
                    email_address: `${userId}@example.com`
                },
                application_context: {
                    brand_name: 'AI Code Generator',
                    locale: 'en-US',
                    shipping_preference: 'NO_SHIPPING',
                    user_action: 'SUBSCRIBE_NOW',
                    payment_method: {
                        payer_selected: 'PAYPAL',
                        payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
                    },
                    return_url: 'https://example.com/return',
                    cancel_url: 'https://example.com/cancel'
                }
            });

            if (paypalResponse.success) {
                return {
                    success: true,
                    subscriptionId: paypalResponse.subscription_id,
                    transactionId: paypalResponse.transaction_id
                };
            } else {
                throw new Error(paypalResponse.error);
            }
        } catch (error) {
            return {
                success: false,
                error: `PayPal subscription failed: ${error}`
            };
        }
    }

    private async processPayPalPayment(userId: string, amount: number, description: string): Promise<PaymentResult> {
        try {
            // Simulate PayPal API call for one-time payment
            const paypalResponse = await this.simulatePayPalAPI({
                intent: 'CAPTURE',
                purchase_units: [{
                    amount: {
                        currency_code: 'USD',
                        value: amount.toString()
                    },
                    description: description
                }],
                payer: {
                    email_address: `${userId}@example.com`
                }
            });

            if (paypalResponse.success) {
                return {
                    success: true,
                    transactionId: paypalResponse.transaction_id
                };
            } else {
                throw new Error(paypalResponse.error);
            }
        } catch (error) {
            return {
                success: false,
                error: `PayPal payment failed: ${error}`
            };
        }
    }

    private async processStripeSubscription(userId: string, plan: SubscriptionPlan): Promise<PaymentResult> {
        try {
            // In a real implementation, this would use the Stripe SDK
            const stripeResponse = await this.simulateStripeAPI({
                customer: userId,
                items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `${plan.name} Plan`,
                            description: plan.description
                        },
                        unit_amount: Math.round(plan.price.monthly * 100), // Stripe uses cents
                        recurring: {
                            interval: 'month'
                        }
                    }
                }],
                mode: 'subscription',
                success_url: 'https://example.com/success',
                cancel_url: 'https://example.com/cancel'
            });

            if (stripeResponse.success) {
                return {
                    success: true,
                    subscriptionId: stripeResponse.subscription_id,
                    transactionId: stripeResponse.payment_intent_id
                };
            } else {
                throw new Error(stripeResponse.error);
            }
        } catch (error) {
            return {
                success: false,
                error: `Stripe subscription failed: ${error}`
            };
        }
    }

    private async processStripePayment(userId: string, amount: number, description: string): Promise<PaymentResult> {
        try {
            // Simulate Stripe payment intent
            const stripeResponse = await this.simulateStripeAPI({
                amount: Math.round(amount * 100), // Stripe uses cents
                currency: 'usd',
                description: description,
                customer: userId,
                confirm: true,
                payment_method: 'pm_card_visa' // Demo payment method
            });

            if (stripeResponse.success) {
                return {
                    success: true,
                    transactionId: stripeResponse.payment_intent_id
                };
            } else {
                throw new Error(stripeResponse.error);
            }
        } catch (error) {
            return {
                success: false,
                error: `Stripe payment failed: ${error}`
            };
        }
    }

    private async processCryptoPayment(userId: string, amount: number, currency: 'bitcoin' | 'ethereum'): Promise<PaymentResult> {
        try {
            // In a real implementation, this would integrate with crypto payment processors
            // like BitPay, CoinGate, or direct blockchain integration
            
            const cryptoAddress = currency === 'bitcoin' ? 
                this.config.crypto.bitcoinAddress : 
                this.config.crypto.ethereumAddress;

            // Show payment instructions to user
            const panel = vscode.window.createWebviewPanel(
                'cryptoPayment',
                `${currency.charAt(0).toUpperCase() + currency.slice(1)} Payment`,
                vscode.ViewColumn.One,
                { enableScripts: true }
            );

            panel.webview.html = this.getCryptoPaymentHtml(currency, amount, cryptoAddress);

            // In a real implementation, you would:
            // 1. Generate a unique address for this transaction
            // 2. Monitor the blockchain for payment confirmation
            // 3. Update the user's account when payment is confirmed

            // For demo purposes, simulate successful payment after user confirmation
            return new Promise((resolve) => {
                panel.webview.onDidReceiveMessage((message) => {
                    if (message.type === 'paymentSent') {
                        panel.dispose();
                        resolve({
                            success: true,
                            transactionId: `${currency}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                        });
                    } else if (message.type === 'paymentCancelled') {
                        panel.dispose();
                        resolve({
                            success: false,
                            error: 'Payment cancelled by user'
                        });
                    }
                });
            });

        } catch (error) {
            return {
                success: false,
                error: `Crypto payment failed: ${error}`
            };
        }
    }

    private async processBankTransfer(userId: string, amount: number): Promise<PaymentResult> {
        try {
            // Show bank transfer instructions
            const panel = vscode.window.createWebviewPanel(
                'bankTransfer',
                'Bank Transfer Payment',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );

            panel.webview.html = this.getBankTransferHtml(amount, this.config.bank);

            // In a real implementation, you would:
            // 1. Generate a unique reference number
            // 2. Monitor for incoming transfers
            // 3. Match transfers by reference number
            // 4. Update user account when transfer is confirmed

            return new Promise((resolve) => {
                panel.webview.onDidReceiveMessage((message) => {
                    if (message.type === 'transferInitiated') {
                        panel.dispose();
                        resolve({
                            success: true,
                            transactionId: `bank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                        });
                    } else if (message.type === 'transferCancelled') {
                        panel.dispose();
                        resolve({
                            success: false,
                            error: 'Bank transfer cancelled by user'
                        });
                    }
                });
            });

        } catch (error) {
            return {
                success: false,
                error: `Bank transfer failed: ${error}`
            };
        }
    }

    public async cancelSubscription(subscriptionId: string): Promise<PaymentResult> {
        try {
            // In a real implementation, this would call the appropriate API
            // to cancel the subscription based on the payment provider

            if (subscriptionId.startsWith('paypal_')) {
                return await this.cancelPayPalSubscription(subscriptionId);
            } else if (subscriptionId.startsWith('stripe_')) {
                return await this.cancelStripeSubscription(subscriptionId);
            } else {
                throw new Error('Unknown subscription provider');
            }
        } catch (error) {
            return {
                success: false,
                error: `Subscription cancellation failed: ${error}`
            };
        }
    }

    private async cancelPayPalSubscription(subscriptionId: string): Promise<PaymentResult> {
        try {
            // Simulate PayPal subscription cancellation
            const response = await this.simulatePayPalAPI({
                subscription_id: subscriptionId,
                reason: 'User requested cancellation'
            });

            return {
                success: response.success,
                error: response.error
            };
        } catch (error) {
            return {
                success: false,
                error: `PayPal cancellation failed: ${error}`
            };
        }
    }

    private async cancelStripeSubscription(subscriptionId: string): Promise<PaymentResult> {
        try {
            // Simulate Stripe subscription cancellation
            const response = await this.simulateStripeAPI({
                subscription_id: subscriptionId,
                cancel_at_period_end: true
            });

            return {
                success: response.success,
                error: response.error
            };
        } catch (error) {
            return {
                success: false,
                error: `Stripe cancellation failed: ${error}`
            };
        }
    }

    // Simulation methods for demo purposes
    private async simulatePayPalAPI(data: any): Promise<any> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Simulate 95% success rate
        if (Math.random() < 0.95) {
            return {
                success: true,
                subscription_id: `paypal_sub_${Date.now()}`,
                transaction_id: `paypal_txn_${Date.now()}`,
                payment_id: `paypal_pay_${Date.now()}`
            };
        } else {
            return {
                success: false,
                error: 'PayPal API error: Insufficient funds'
            };
        }
    }

    private async simulateStripeAPI(data: any): Promise<any> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Simulate 95% success rate
        if (Math.random() < 0.95) {
            return {
                success: true,
                subscription_id: `stripe_sub_${Date.now()}`,
                payment_intent_id: `stripe_pi_${Date.now()}`,
                customer_id: `stripe_cus_${Date.now()}`
            };
        } else {
            return {
                success: false,
                error: 'Stripe API error: Card declined'
            };
        }
    }

    private getCryptoPaymentHtml(currency: string, amount: number, address: string): string {
        const currencySymbol = currency === 'bitcoin' ? '₿' : 'Ξ';
        const currencyName = currency.charAt(0).toUpperCase() + currency.slice(1);
        
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
                    text-align: center;
                }
                .payment-container {
                    max-width: 500px;
                    margin: 0 auto;
                    background: var(--vscode-textBlockQuote-background);
                    padding: 30px;
                    border-radius: 12px;
                    border: 1px solid var(--vscode-panel-border);
                }
                .currency-icon {
                    font-size: 64px;
                    margin-bottom: 20px;
                }
                .amount {
                    font-size: 32px;
                    font-weight: bold;
                    color: var(--vscode-textLink-foreground);
                    margin-bottom: 20px;
                }
                .address {
                    background: var(--vscode-input-background);
                    border: 1px solid var(--vscode-input-border);
                    padding: 15px;
                    border-radius: 6px;
                    font-family: monospace;
                    word-break: break-all;
                    margin: 20px 0;
                    cursor: pointer;
                }
                .qr-placeholder {
                    width: 200px;
                    height: 200px;
                    background: var(--vscode-input-background);
                    border: 1px solid var(--vscode-input-border);
                    margin: 20px auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                }
                .btn {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    margin: 10px;
                    font-weight: bold;
                }
                .btn-primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                .instructions {
                    text-align: left;
                    margin: 20px 0;
                    padding: 15px;
                    background: var(--vscode-inputValidation-infoBackground);
                    border-radius: 6px;
                }
                .warning {
                    background: var(--vscode-inputValidation-warningBackground);
                    padding: 10px;
                    border-radius: 6px;
                    margin: 15px 0;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <div class="payment-container">
                <div class="currency-icon">${currencySymbol}</div>
                <h2>Pay with ${currencyName}</h2>
                <div class="amount">$${amount.toFixed(2)} USD</div>
                
                <div class="instructions">
                    <h3>Payment Instructions:</h3>
                    <ol>
                        <li>Copy the ${currencyName} address below</li>
                        <li>Send the exact amount to this address</li>
                        <li>Click "I've Sent Payment" after sending</li>
                        <li>Wait for blockchain confirmation</li>
                    </ol>
                </div>
                
                <div class="address" onclick="copyAddress()" title="Click to copy">
                    ${address}
                </div>
                
                <div class="qr-placeholder">
                    QR Code<br>
                    (Would show actual QR code)
                </div>
                
                <div class="warning">
                    ⚠️ Only send ${currencyName} to this address. Sending other cryptocurrencies will result in loss of funds.
                </div>
                
                <button class="btn btn-primary" onclick="confirmPayment()">I've Sent Payment</button>
                <button class="btn" onclick="cancelPayment()">Cancel</button>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                
                function copyAddress() {
                    navigator.clipboard.writeText('${address}');
                    alert('Address copied to clipboard!');
                }
                
                function confirmPayment() {
                    vscode.postMessage({ type: 'paymentSent' });
                }
                
                function cancelPayment() {
                    vscode.postMessage({ type: 'paymentCancelled' });
                }
            </script>
        </body>
        </html>
        `;
    }

    private getBankTransferHtml(amount: number, bankConfig: any): string {
        const referenceNumber = `AI-${Date.now()}`;
        
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
                }
                .payment-container {
                    max-width: 600px;
                    margin: 0 auto;
                    background: var(--vscode-textBlockQuote-background);
                    padding: 30px;
                    border-radius: 12px;
                    border: 1px solid var(--vscode-panel-border);
                }
                .bank-icon {
                    font-size: 64px;
                    text-align: center;
                    margin-bottom: 20px;
                }
                .amount {
                    font-size: 32px;
                    font-weight: bold;
                    color: var(--vscode-textLink-foreground);
                    text-align: center;
                    margin-bottom: 30px;
                }
                .bank-details {
                    background: var(--vscode-input-background);
                    border: 1px solid var(--vscode-input-border);
                    padding: 20px;
                    border-radius: 6px;
                    margin: 20px 0;
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
                .detail-value {
                    font-family: monospace;
                    cursor: pointer;
                }
                .reference {
                    background: var(--vscode-inputValidation-infoBackground);
                    padding: 15px;
                    border-radius: 6px;
                    margin: 20px 0;
                    text-align: center;
                }
                .reference-number {
                    font-size: 24px;
                    font-weight: bold;
                    font-family: monospace;
                    color: var(--vscode-textLink-foreground);
                    margin: 10px 0;
                }
                .instructions {
                    margin: 20px 0;
                    padding: 15px;
                    background: var(--vscode-inputValidation-infoBackground);
                    border-radius: 6px;
                }
                .btn {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    margin: 10px;
                    font-weight: bold;
                }
                .btn-primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                .warning {
                    background: var(--vscode-inputValidation-warningBackground);
                    padding: 10px;
                    border-radius: 6px;
                    margin: 15px 0;
                    font-size: 14px;
                }
                .center {
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <div class="payment-container">
                <div class="bank-icon">🏦</div>
                <h2 style="text-align: center;">Bank Transfer Payment</h2>
                <div class="amount">$${amount.toFixed(2)} USD</div>
                
                <div class="bank-details">
                    <h3>Bank Details:</h3>
                    <div class="detail-row">
                        <span class="detail-label">Account Name:</span>
                        <span class="detail-value">AI Code Generator LLC</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Account Number:</span>
                        <span class="detail-value" onclick="copyText('${bankConfig.accountNumber}')">${bankConfig.accountNumber}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Routing Number:</span>
                        <span class="detail-value" onclick="copyText('${bankConfig.routingNumber}')">${bankConfig.routingNumber}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Bank Name:</span>
                        <span class="detail-value">Demo Bank</span>
                    </div>
                </div>
                
                <div class="reference">
                    <h3>Important: Include this reference number</h3>
                    <div class="reference-number" onclick="copyText('${referenceNumber}')">${referenceNumber}</div>
                    <small>Click to copy</small>
                </div>
                
                <div class="instructions">
                    <h3>Transfer Instructions:</h3>
                    <ol>
                        <li>Log into your online banking or visit your bank</li>
                        <li>Set up a transfer to the account details above</li>
                        <li>Enter the exact amount: $${amount.toFixed(2)}</li>
                        <li><strong>Include the reference number: ${referenceNumber}</strong></li>
                        <li>Complete the transfer</li>
                        <li>Click "Transfer Initiated" below</li>
                    </ol>
                </div>
                
                <div class="warning">
                    ⚠️ Please include the reference number in your transfer description. This helps us identify your payment quickly.
                </div>
                
                <div class="center">
                    <button class="btn btn-primary" onclick="confirmTransfer()">Transfer Initiated</button>
                    <button class="btn" onclick="cancelTransfer()">Cancel</button>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                
                function copyText(text) {
                    navigator.clipboard.writeText(text);
                    alert('Copied to clipboard: ' + text);
                }
                
                function confirmTransfer() {
                    vscode.postMessage({ type: 'transferInitiated' });
                }
                
                function cancelTransfer() {
                    vscode.postMessage({ type: 'transferCancelled' });
                }
            </script>
        </body>
        </html>
        `;
    }
}