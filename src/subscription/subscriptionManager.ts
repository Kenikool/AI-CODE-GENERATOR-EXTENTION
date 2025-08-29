import * as vscode from 'vscode';
import { PaymentProvider } from './paymentProvider';

export interface User {
    id: string;
    name: string;
    email: string;
    plan: 'Free' | 'Pro' | 'Enterprise';
    credits: number;
    subscription?: {
        id: string;
        status: 'active' | 'cancelled' | 'expired';
        currentPeriodEnd: Date;
        autoRenew: boolean;
    };
    usage: {
        today: number;
        thisMonth: number;
        total: number;
        codeGeneration: number;
        scanning: number;
        projectCreation: number;
    };
    stats: {
        filesGenerated: number;
        bugsFixed: number;
        timesSaved: string;
        projectsCreated: number;
    };
    preferences: {
        notifications: boolean;
        autoScan: boolean;
        theme: 'auto' | 'light' | 'dark';
    };
}

export interface SubscriptionPlan {
    id: string;
    name: string;
    description: string;
    price: {
        monthly: number;
        yearly: number;
    };
    credits: {
        monthly: number;
        rollover: boolean;
    };
    features: string[];
    limits: {
        projectScans: number;
        fileGeneration: number;
        aiRequests: number;
    };
    popular?: boolean;
    discount?: {
        percentage: number;
        validUntil: Date;
    };
}

export interface CreditPackage {
    id: string;
    name: string;
    credits: number;
    price: number;
    bonus?: number;
    popular?: boolean;
}

export class SubscriptionManager {
    private currentUser: User | null = null;
    private plans: SubscriptionPlan[] = [];
    private creditPackages: CreditPackage[] = [];

    constructor(private paymentProvider: PaymentProvider) {
        this.initializePlans();
        this.initializeCreditPackages();
        this.loadUserData();
    }

    private initializePlans() {
        this.plans = [
            {
                id: 'free',
                name: 'Free',
                description: 'Perfect for getting started with AI development',
                price: { monthly: 0, yearly: 0 },
                credits: { monthly: 100, rollover: false },
                features: [
                    'Smart File Creation',
                    'Basic Code Generation',
                    'AI Chat Assistant',
                    'Basic Project Scanning',
                    'Community Support'
                ],
                limits: {
                    projectScans: 5,
                    fileGeneration: 50,
                    aiRequests: 100
                }
            },
            {
                id: 'pro',
                name: 'Pro',
                description: 'For professional developers who need more power',
                price: { monthly: 19.99, yearly: 199.99 },
                credits: { monthly: 1000, rollover: true },
                features: [
                    'Everything in Free',
                    'Advanced Project Scanning',
                    'Security & Performance Analysis',
                    'Complete Project Generation',
                    'Microservices Setup',
                    'Component Libraries',
                    'Priority Support',
                    'Advanced Debugging',
                    'Custom Templates'
                ],
                limits: {
                    projectScans: 100,
                    fileGeneration: 1000,
                    aiRequests: 2000
                },
                popular: true,
                discount: {
                    percentage: 20,
                    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                }
            },
            {
                id: 'enterprise',
                name: 'Enterprise',
                description: 'For teams and organizations with advanced needs',
                price: { monthly: 49.99, yearly: 499.99 },
                credits: { monthly: 5000, rollover: true },
                features: [
                    'Everything in Pro',
                    'Unlimited Project Scans',
                    'Team Collaboration',
                    'Custom AI Models',
                    'API Access',
                    'Advanced Analytics',
                    'Dedicated Support',
                    'Custom Integrations',
                    'SSO & Security',
                    'Compliance Reports'
                ],
                limits: {
                    projectScans: -1, // Unlimited
                    fileGeneration: -1,
                    aiRequests: -1
                }
            }
        ];
    }

    private initializeCreditPackages() {
        this.creditPackages = [
            {
                id: 'small',
                name: 'Starter Pack',
                credits: 500,
                price: 9.99
            },
            {
                id: 'medium',
                name: 'Developer Pack',
                credits: 1500,
                price: 24.99,
                bonus: 200,
                popular: true
            },
            {
                id: 'large',
                name: 'Pro Pack',
                credits: 3000,
                price: 44.99,
                bonus: 500
            },
            {
                id: 'enterprise',
                name: 'Enterprise Pack',
                credits: 10000,
                price: 149.99,
                bonus: 2000
            }
        ];
    }

    public async getCurrentUser(): Promise<User | null> {
        if (!this.currentUser) {
            await this.loadUserData();
        }
        return this.currentUser;
    }

    public async loadUserData(): Promise<void> {
        try {
            // Load from VS Code global state
            const userData = vscode.workspace.getConfiguration('aiCodeGenerator').get('userData');
            
            if (userData) {
                this.currentUser = userData as User;
            } else {
                // Create new user
                this.currentUser = this.createNewUser();
                await this.saveUserData();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            this.currentUser = this.createNewUser();
        }
    }

    private createNewUser(): User {
        return {
            id: this.generateUserId(),
            name: 'Developer',
            email: '',
            plan: 'Free',
            credits: 100,
            usage: {
                today: 0,
                thisMonth: 0,
                total: 0,
                codeGeneration: 0,
                scanning: 0,
                projectCreation: 0
            },
            stats: {
                filesGenerated: 0,
                bugsFixed: 0,
                timesSaved: '0 hours',
                projectsCreated: 0
            },
            preferences: {
                notifications: true,
                autoScan: false,
                theme: 'auto'
            }
        };
    }

    private generateUserId(): string {
        return 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

    public async saveUserData(): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('aiCodeGenerator');
            await config.update('userData', this.currentUser, vscode.ConfigurationTarget.Global);
        } catch (error) {
            console.error('Error saving user data:', error);
        }
    }

    public async upgradeSubscription(planId: string, paymentMethod: string): Promise<boolean> {
        try {
            const plan = this.plans.find(p => p.id === planId);
            if (!plan) {
                throw new Error('Plan not found');
            }

            if (!this.currentUser) {
                throw new Error('User not found');
            }

            // Process payment
            const paymentResult = await this.paymentProvider.processSubscription(
                this.currentUser.id,
                plan,
                paymentMethod
            );

            if (paymentResult.success) {
                // Update user subscription
                this.currentUser.plan = plan.name as any;
                this.currentUser.credits += plan.credits.monthly;
                this.currentUser.subscription = {
                    id: paymentResult.subscriptionId!,
                    status: 'active',
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                    autoRenew: true
                };

                await this.saveUserData();
                
                vscode.window.showInformationMessage(
                    `Successfully upgraded to ${plan.name}! You now have ${this.currentUser.credits} credits.`
                );

                return true;
            } else {
                vscode.window.showErrorMessage(`Payment failed: ${paymentResult.error}`);
                return false;
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Upgrade failed: ${error}`);
            return false;
        }
    }

    public async purchaseCredits(packageId: string, paymentMethod: string): Promise<boolean> {
        try {
            const creditPackage = this.creditPackages.find(p => p.id === packageId);
            if (!creditPackage) {
                throw new Error('Credit package not found');
            }

            if (!this.currentUser) {
                throw new Error('User not found');
            }

            // Process payment
            const paymentResult = await this.paymentProvider.processOneTimePayment(
                this.currentUser.id,
                creditPackage.price,
                `Credits: ${creditPackage.name}`,
                paymentMethod
            );

            if (paymentResult.success) {
                // Add credits to user account
                const totalCredits = creditPackage.credits + (creditPackage.bonus || 0);
                this.currentUser.credits += totalCredits;

                await this.saveUserData();
                
                vscode.window.showInformationMessage(
                    `Successfully purchased ${totalCredits} credits! Your balance is now ${this.currentUser.credits} credits.`
                );

                return true;
            } else {
                vscode.window.showErrorMessage(`Payment failed: ${paymentResult.error}`);
                return false;
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Credit purchase failed: ${error}`);
            return false;
        }
    }

    public async cancelSubscription(): Promise<boolean> {
        try {
            if (!this.currentUser?.subscription) {
                throw new Error('No active subscription found');
            }

            const result = await this.paymentProvider.cancelSubscription(this.currentUser.subscription.id);
            
            if (result.success) {
                this.currentUser.subscription.status = 'cancelled';
                this.currentUser.subscription.autoRenew = false;
                
                await this.saveUserData();
                
                vscode.window.showInformationMessage(
                    'Subscription cancelled. You can continue using Pro features until the end of your billing period.'
                );

                return true;
            } else {
                vscode.window.showErrorMessage(`Cancellation failed: ${result.error}`);
                return false;
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Cancellation failed: ${error}`);
            return false;
        }
    }

    public async consumeCredits(amount: number, feature: string): Promise<boolean> {
        if (!this.currentUser) {
            return false;
        }

        if (this.currentUser.credits < amount) {
            const choice = await vscode.window.showWarningMessage(
                `Insufficient credits (${this.currentUser.credits}/${amount}). Would you like to purchase more?`,
                'Buy Credits',
                'Upgrade Plan',
                'Cancel'
            );

            switch (choice) {
                case 'Buy Credits':
                    await this.showCreditPurchaseDialog();
                    break;
                case 'Upgrade Plan':
                    await this.showSubscriptionPlans();
                    break;
            }

            return false;
        }

        // Consume credits
        this.currentUser.credits -= amount;
        this.currentUser.usage.today += amount;
        this.currentUser.usage.thisMonth += amount;
        this.currentUser.usage.total += amount;

        // Update feature-specific usage
        switch (feature) {
            case 'codeGeneration':
                this.currentUser.usage.codeGeneration += amount;
                break;
            case 'scanning':
                this.currentUser.usage.scanning += amount;
                break;
            case 'projectCreation':
                this.currentUser.usage.projectCreation += amount;
                break;
        }

        await this.saveUserData();
        return true;
    }

    public async checkFeatureAccess(feature: string): Promise<boolean> {
        if (!this.currentUser) {
            return false;
        }

        const plan = this.plans.find(p => p.name === this.currentUser!.plan);
        if (!plan) {
            return false;
        }

        // Check if feature is included in current plan
        const featureMap: { [key: string]: string[] } = {
            'Free': [
                'Smart File Creation',
                'Basic Code Generation',
                'AI Chat Assistant',
                'Basic Project Scanning'
            ],
            'Pro': [
                'Advanced Project Scanning',
                'Security & Performance Analysis',
                'Complete Project Generation',
                'Microservices Setup',
                'Component Libraries',
                'Advanced Debugging'
            ],
            'Enterprise': [
                'Unlimited Project Scans',
                'Team Collaboration',
                'Custom AI Models',
                'API Access'
            ]
        };

        const availableFeatures = featureMap[this.currentUser.plan] || [];
        return availableFeatures.includes(feature) || this.currentUser.plan !== 'Free';
    }

    public async showSubscriptionPlans(): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'subscriptionPlans',
            'Subscription Plans',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        panel.webview.html = this.getSubscriptionPlansHtml();

        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'selectPlan':
                    await this.handlePlanSelection(message.planId);
                    break;
                case 'selectPayment':
                    await this.handlePaymentSelection(message.planId, message.paymentMethod);
                    panel.dispose();
                    break;
            }
        });
    }

    public async showCreditPurchaseDialog(): Promise<void> {
        const panel = vscode.window.createWebviewPanel(
            'creditPurchase',
            'Purchase Credits',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        panel.webview.html = this.getCreditPurchaseHtml();

        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'purchaseCredits':
                    await this.handleCreditPurchase(message.packageId, message.paymentMethod);
                    panel.dispose();
                    break;
            }
        });
    }

    private async handlePlanSelection(planId: string): Promise<void> {
        const plan = this.plans.find(p => p.id === planId);
        if (!plan) return;

        const paymentMethods = await this.paymentProvider.getAvailablePaymentMethods();
        
        const choice = await vscode.window.showQuickPick(
            paymentMethods.map(method => ({
                label: method.name,
                description: method.description,
                detail: method.id
            })),
            { placeHolder: `Select payment method for ${plan.name} plan` }
        );

        if (choice) {
            await this.upgradeSubscription(planId, choice.detail);
        }
    }

    private async handlePaymentSelection(planId: string, paymentMethod: string): Promise<void> {
        await this.upgradeSubscription(planId, paymentMethod);
    }

    private async handleCreditPurchase(packageId: string, paymentMethod: string): Promise<void> {
        await this.purchaseCredits(packageId, paymentMethod);
    }

    private getSubscriptionPlansHtml(): string {
        const plansHtml = this.plans.map(plan => {
            const isCurrentPlan = this.currentUser?.plan === plan.name;
            const discount = plan.discount ? 
                `<div class="discount">🎉 ${plan.discount.percentage}% OFF - Limited Time!</div>` : '';
            
            return `
                <div class="plan-card ${plan.popular ? 'popular' : ''} ${isCurrentPlan ? 'current' : ''}">
                    ${plan.popular ? '<div class="popular-badge">Most Popular</div>' : ''}
                    ${discount}
                    <h3>${plan.name}</h3>
                    <p class="plan-description">${plan.description}</p>
                    <div class="price">
                        <span class="price-amount">$${plan.price.monthly}</span>
                        <span class="price-period">/month</span>
                    </div>
                    <div class="yearly-price">$${plan.price.yearly}/year (Save ${Math.round((1 - plan.price.yearly / (plan.price.monthly * 12)) * 100)}%)</div>
                    <div class="credits">${plan.credits.monthly} credits/month</div>
                    <ul class="features">
                        ${plan.features.map(feature => `<li>✓ ${feature}</li>`).join('')}
                    </ul>
                    ${isCurrentPlan ? 
                        '<button class="btn current-plan">Current Plan</button>' :
                        `<button class="btn select-plan" onclick="selectPlan('${plan.id}')">
                            ${plan.price.monthly === 0 ? 'Current Plan' : 'Upgrade Now'}
                        </button>`
                    }
                </div>
            `;
        }).join('');

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    margin: 0;
                    padding: 20px;
                }
                .plans-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 20px;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .plan-card {
                    background: var(--vscode-textBlockQuote-background);
                    border: 2px solid var(--vscode-panel-border);
                    border-radius: 12px;
                    padding: 30px;
                    text-align: center;
                    position: relative;
                    transition: transform 0.2s ease;
                }
                .plan-card:hover {
                    transform: translateY(-5px);
                }
                .plan-card.popular {
                    border-color: #667eea;
                    box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
                }
                .plan-card.current {
                    border-color: #66bb6a;
                }
                .popular-badge {
                    position: absolute;
                    top: -10px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 5px 20px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: bold;
                }
                .discount {
                    background: #ff6b6b;
                    color: white;
                    padding: 8px;
                    border-radius: 6px;
                    margin-bottom: 15px;
                    font-weight: bold;
                    font-size: 14px;
                }
                .price {
                    margin: 20px 0;
                }
                .price-amount {
                    font-size: 48px;
                    font-weight: bold;
                    color: var(--vscode-textLink-foreground);
                }
                .price-period {
                    font-size: 16px;
                    opacity: 0.7;
                }
                .yearly-price {
                    font-size: 14px;
                    opacity: 0.7;
                    margin-bottom: 10px;
                }
                .credits {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    padding: 8px 16px;
                    border-radius: 20px;
                    display: inline-block;
                    margin: 15px 0;
                    font-weight: bold;
                }
                .features {
                    list-style: none;
                    padding: 0;
                    margin: 20px 0;
                    text-align: left;
                }
                .features li {
                    padding: 8px 0;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                .features li:last-child {
                    border-bottom: none;
                }
                .btn {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 25px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 16px;
                    width: 100%;
                    margin-top: 20px;
                    transition: opacity 0.2s ease;
                }
                .btn:hover {
                    opacity: 0.9;
                }
                .btn.current-plan {
                    background: #66bb6a;
                    cursor: default;
                }
                h1 {
                    text-align: center;
                    margin-bottom: 40px;
                    color: var(--vscode-textLink-foreground);
                }
                .header-text {
                    text-align: center;
                    margin-bottom: 40px;
                    opacity: 0.8;
                }
            </style>
        </head>
        <body>
            <h1>Choose Your Plan</h1>
            <p class="header-text">Unlock the full power of AI-driven development</p>
            
            <div class="plans-container">
                ${plansHtml}
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                
                function selectPlan(planId) {
                    vscode.postMessage({
                        type: 'selectPlan',
                        planId: planId
                    });
                }
            </script>
        </body>
        </html>
        `;
    }

    private getCreditPurchaseHtml(): string {
        const packagesHtml = this.creditPackages.map(pkg => {
            const totalCredits = pkg.credits + (pkg.bonus || 0);
            const pricePerCredit = (pkg.price / totalCredits).toFixed(3);
            
            return `
                <div class="credit-package ${pkg.popular ? 'popular' : ''}">
                    ${pkg.popular ? '<div class="popular-badge">Best Value</div>' : ''}
                    <h3>${pkg.name}</h3>
                    <div class="credits-amount">${pkg.credits.toLocaleString()}</div>
                    <div class="credits-label">Credits</div>
                    ${pkg.bonus ? `<div class="bonus">+ ${pkg.bonus} Bonus Credits!</div>` : ''}
                    <div class="price">$${pkg.price}</div>
                    <div class="price-per-credit">$${pricePerCredit} per credit</div>
                    <button class="btn" onclick="purchaseCredits('${pkg.id}')">Purchase</button>
                </div>
            `;
        }).join('');

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    margin: 0;
                    padding: 20px;
                }
                .packages-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                    max-width: 1000px;
                    margin: 0 auto;
                }
                .credit-package {
                    background: var(--vscode-textBlockQuote-background);
                    border: 2px solid var(--vscode-panel-border);
                    border-radius: 12px;
                    padding: 25px;
                    text-align: center;
                    position: relative;
                    transition: transform 0.2s ease;
                }
                .credit-package:hover {
                    transform: translateY(-3px);
                }
                .credit-package.popular {
                    border-color: #667eea;
                    box-shadow: 0 0 15px rgba(102, 126, 234, 0.3);
                }
                .popular-badge {
                    position: absolute;
                    top: -10px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 5px 15px;
                    border-radius: 15px;
                    font-size: 11px;
                    font-weight: bold;
                }
                .credits-amount {
                    font-size: 36px;
                    font-weight: bold;
                    color: var(--vscode-textLink-foreground);
                    margin: 15px 0 5px 0;
                }
                .credits-label {
                    font-size: 14px;
                    opacity: 0.7;
                    margin-bottom: 15px;
                }
                .bonus {
                    background: #ff6b6b;
                    color: white;
                    padding: 5px 10px;
                    border-radius: 15px;
                    font-size: 12px;
                    font-weight: bold;
                    margin: 10px 0;
                    display: inline-block;
                }
                .price {
                    font-size: 24px;
                    font-weight: bold;
                    margin: 15px 0 5px 0;
                }
                .price-per-credit {
                    font-size: 12px;
                    opacity: 0.6;
                    margin-bottom: 20px;
                }
                .btn {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    padding: 10px 25px;
                    border-radius: 20px;
                    cursor: pointer;
                    font-weight: bold;
                    width: 100%;
                    transition: opacity 0.2s ease;
                }
                .btn:hover {
                    opacity: 0.9;
                }
                h1 {
                    text-align: center;
                    margin-bottom: 30px;
                    color: var(--vscode-textLink-foreground);
                }
                .header-text {
                    text-align: center;
                    margin-bottom: 30px;
                    opacity: 0.8;
                }
            </style>
        </head>
        <body>
            <h1>Purchase Credits</h1>
            <p class="header-text">Get more credits to unlock advanced AI features</p>
            
            <div class="packages-container">
                ${packagesHtml}
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                
                function purchaseCredits(packageId) {
                    // For now, default to PayPal
                    vscode.postMessage({
                        type: 'purchaseCredits',
                        packageId: packageId,
                        paymentMethod: 'paypal'
                    });
                }
            </script>
        </body>
        </html>
        `;
    }

    public getPlans(): SubscriptionPlan[] {
        return this.plans;
    }

    public getCreditPackages(): CreditPackage[] {
        return this.creditPackages;
    }

    public async updateUserStats(stats: Partial<User['stats']>): Promise<void> {
        if (!this.currentUser) return;

        Object.assign(this.currentUser.stats, stats);
        await this.saveUserData();
    }

    public async resetDailyUsage(): Promise<void> {
        if (!this.currentUser) return;

        this.currentUser.usage.today = 0;
        await this.saveUserData();
    }

    public async resetMonthlyUsage(): Promise<void> {
        if (!this.currentUser) return;

        this.currentUser.usage.thisMonth = 0;
        
        // Add monthly credits for subscription users
        if (this.currentUser.subscription?.status === 'active') {
            const plan = this.plans.find(p => p.name === this.currentUser!.plan);
            if (plan) {
                this.currentUser.credits += plan.credits.monthly;
            }
        }

        await this.saveUserData();
    }
}