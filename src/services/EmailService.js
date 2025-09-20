import { Resend } from 'resend';

/**
 * Email Service using Resend for both development and production
 * Handles password reset emails and other transactional emails
 */
class EmailService {
    constructor() {
        this.resend = new Resend(process.env.RESEND_API_KEY);
        this.fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev'; // Use Resend's test domain for dev
        this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3200';
        this.isConfigured = !!(process.env.RESEND_API_KEY);

        if (!this.isConfigured) {
            console.warn('⚠️  Email service not configured. Set RESEND_API_KEY to enable email sending.');
        } else if (this.fromEmail === 'onboarding@resend.dev') {
            // eslint-disable-next-line no-console
            console.log('📧 Using Resend test domain for development emails');
        }
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(email, resetToken, userName = null) {
        try {
            const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;
            const displayName = userName || email.split('@')[0];

            const htmlContent = this.generatePasswordResetHTML({
                userName: displayName,
                resetUrl,
                expiresIn: '1 hour',
                supportEmail: this.fromEmail
            });

            const result = await this.resend.emails.send({
                from: this.fromEmail,
                to: email,
                subject: 'Reset Your Password - Image Harvest',
                html: htmlContent,
                text: this.generatePasswordResetText({
                    userName: displayName,
                    resetUrl,
                    expiresIn: '1 hour'
                })
            });

            // eslint-disable-next-line no-console
            console.log('✅ Password reset email sent successfully:', {
                email,
                messageId: result.data?.id
            });

            return {
                success: true,
                messageId: result.data?.id
            };

        } catch (error) {
            console.error('❌ Failed to send password reset email:', error);
            throw new Error('Failed to send password reset email');
        }
    }

    /**
     * Send welcome email for new users
     */
    async sendWelcomeEmail(email, userName = null) {
        try {
            const displayName = userName || email.split('@')[0];
            const loginUrl = `${this.frontendUrl}/login.html`;

            const htmlContent = this.generateWelcomeHTML({
                userName: displayName,
                loginUrl,
                supportEmail: this.fromEmail
            });

            const result = await this.resend.emails.send({
                from: this.fromEmail,
                to: email,
                subject: 'Welcome to Image Harvest!',
                html: htmlContent,
                text: this.generateWelcomeText({
                    userName: displayName,
                    loginUrl
                })
            });

            // eslint-disable-next-line no-console
            console.log('✅ Welcome email sent successfully:', {
                email,
                messageId: result.data?.id
            });

            return {
                success: true,
                messageId: result.data?.id
            };

        } catch (error) {
            console.error('❌ Failed to send welcome email:', error);

            // Don't throw error for welcome emails - registration should still succeed
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate HTML content for password reset email
     */
    // eslint-disable-next-line
    generatePasswordResetHTML({ userName, resetUrl, expiresIn, supportEmail }) {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f5f5f5;
                }
                .container {
                    background: white;
                    padding: 40px;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                }
                .logo {
                    font-size: 28px;
                    font-weight: bold;
                    color: #3B82F6;
                    margin-bottom: 10px;
                }
                .button {
                    display: inline-block;
                    background-color: #3B82F6;
                    color: white;
                    padding: 12px 30px;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: 600;
                    margin: 20px 0;
                }
                .button:hover {
                    background-color: #2563EB;
                }
                .warning {
                    background-color: #FEF3C7;
                    border-left: 4px solid #F59E0B;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 4px;
                }
                .footer {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                    font-size: 14px;
                    color: #666;
                }
                .security-tips {
                    background-color: #F0F9FF;
                    border-left: 4px solid #3B82F6;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 4px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🖼️ Image Harvest</div>
                    <h1>Reset Your Password</h1>
                </div>

                <p>Hi ${userName},</p>

                <p>We received a request to reset your password for your Image Harvest account. ` +
                `If you made this request, click the button below to reset your password:</p>

                <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">Reset Password</a>
                </div>

                <div class="warning">
                    <strong>⏰ This link expires in ${expiresIn}</strong><br>
                    For security reasons, this password reset link will only work once and expires soon.
                </div>

                <div class="security-tips">
                    <strong>🔒 Security Tips:</strong>
                    <ul>
                        <li>Never share your password reset link with anyone</li>
                        <li>If you didn't request this reset, you can safely ignore this email</li>
                        <li>Make sure to choose a strong, unique password</li>
                    </ul>
                </div>

                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666; font-size: 14px;">${resetUrl}</p>

                <div class="footer">
                    <p>If you didn't request this password reset, please ignore this email</p>
                    <p>Thanks,<br>The Image Harvest Team</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Generate plain text content for password reset email
     */
    generatePasswordResetText({ userName, resetUrl, expiresIn }) {
        return `
Hi ${userName},

We received a request to reset your password for your Image Harvest account.

Reset your password by visiting this link:
${resetUrl}

This link expires in ${expiresIn} for security reasons.

If you didn't request this password reset, you can safely ignore this email.

Thanks,
The Image Harvest Team
        `.trim();
    }

    /**
     * Generate HTML content for welcome email
     */
    // eslint-disable-next-line
    generateWelcomeHTML({ userName, loginUrl, supportEmail }) {
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Image Harvest</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f5f5f5;
                }
                .container {
                    background: white;
                    padding: 40px;
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                }
                .logo {
                    font-size: 32px;
                    margin-bottom: 10px;
                }
                .button {
                    display: inline-block;
                    background-color: #10B981;
                    color: white;
                    padding: 12px 30px;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: 600;
                    margin: 20px 0;
                }
                .features {
                    background-color: #F0FDF4;
                    padding: 20px;
                    border-radius: 6px;
                    margin: 20px 0;
                }
                .footer {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                    font-size: 14px;
                    color: #666;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🎉</div>
                    <h1>Welcome to Image Harvest!</h1>
                </div>

                <p>Hi ${userName},</p>

                <p>Welcome your account has been successfully created!</p>

                <div style="text-align: center;">
                    <a href="${loginUrl}" class="button">Start Creating Images</a>
                </div>

                <div class="features">
                    <h3>🚀 What you can do:</h3>
                    <ul>
                        <li>🎨 Generate AI images with multiple providers</li>
                        <li>📊 Track your generation history and costs</li>
                        <li>🔍 Search and filter your creations</li>
                        <li>⭐ Rate and organize your favorite images</li>
                    </ul>
                </div>
                <div class="footer">
                    <p>Need help? Contact us at <a href="mailto:${supportEmail}">${supportEmail}</a></p>
                    <p>Happy creating!<br>The Image Harvest Team</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Generate plain text content for welcome email
     */
    generateWelcomeText({ userName, loginUrl }) {
        return `
Hi ${userName},

Welcome to Image Harvest! Your account has been successfully created.

Start creating AI images by visiting: ${loginUrl}

What you can do:
- Generate AI images with multiple providers
- Track your generation history and costs
- Search and filter your creations
- Rate and organize your favorite images

Happy creating!
The Image Harvest Team
        `.trim();
    }

    /**
     * Test email configuration
     */
    async testConfiguration() {
        try {
            // Send a test email to verify configuration
            const testResult = await this.resend.emails.send({
                from: this.fromEmail,
                to: 'test@example.com', // This won't actually send
                subject: 'Test Email Configuration',
                html: '<p>This is a test email.</p>'
            });

            return {
                success: true,
                message: 'Email configuration is valid',
                details: testResult
            };
        } catch (error) {
            return {
                success: false,
                message: 'Email configuration failed',
                error: error.message
            };
        }
    }
}

export default new EmailService();
