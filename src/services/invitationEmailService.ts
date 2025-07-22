import { OrganizationInvitation } from '@/types/organization';
import { supabase } from '@/integrations/supabase/client';

interface InvitationEmailData {
  recipientEmail: string;
  recipientName?: string;
  organizationName: string;
  inviterName: string;
  inviterEmail: string;
  invitationId: string;
  role: 'admin' | 'user';
  acceptUrl: string;
  expiresAt: string;
  invitationToken: string;
  personalMessage?: string;
}

export class InvitationEmailService {
  private baseUrl: string;
  private resendApiKey: string;
  private fromEmail: string;
  private publicAppUrl: string;

  constructor() {
    this.baseUrl = window.location.origin;
    this.resendApiKey = import.meta.env.VITE_RESEND_API_KEY || import.meta.env.RESEND_API_KEY || '';
    this.fromEmail = import.meta.env.VITE_FROM_EMAIL || import.meta.env.SMTP_FROM_EMAIL || 'hello@salessheet.ai';
    this.publicAppUrl = import.meta.env.VITE_PUBLIC_APP_URL || import.meta.env.PUBLIC_APP_URL || 'https://app.salessheet.ai/';
  }

  /**
   * Send invitation email to new user using Resend
   */
  async sendInvitationEmail(invitation: OrganizationInvitation, organizationName: string, inviterName: string): Promise<void> {
    const emailData: InvitationEmailData = {
      recipientEmail: invitation.email,
      recipientName: invitation.email.split('@')[0], // Use email prefix as name
      organizationName: organizationName,
      inviterName: inviterName,
      inviterEmail: invitation.inviter?.email || 'your team',
      role: invitation.role,
      acceptUrl: `${this.baseUrl}/accept-invitation/${invitation.id}`,
      expiresAt: invitation.expires_at,
      invitationToken: invitation.token || invitation.id, // Use ID as fallback
      personalMessage: invitation.message || undefined,
    };

    try {
      // Use Supabase Edge Function to send email (avoids CORS issues)
      const { data, error } = await supabase.functions.invoke('send-invitation-email', {
        body: {
          to: emailData.recipientEmail,
          organizationName: emailData.organizationName,
          inviterName: emailData.inviterName,
          inviterEmail: emailData.inviterEmail,
          role: emailData.role,
          invitationToken: emailData.invitationToken,
          personalMessage: emailData.personalMessage,
          expiresAt: emailData.expiresAt,
        }
      });

      if (error) {
        throw error;
      }

      console.log('✅ Invitation email sent successfully via Edge Function');
      
      // Still show local preview in development
      if (import.meta.env.DEV) {
        console.log('📧 Email Preview:', {
          to: emailData.recipientEmail,
          subject: `Invitation to join ${emailData.organizationName}`,
          acceptUrl: `${this.publicAppUrl}/accept-invitation?token=${emailData.invitationToken}`
        });
      }

    } catch (error) {
      console.error('❌ Failed to send invitation email:', error);
      
      // Fallback to simulation in development
      if (import.meta.env.DEV) {
        console.log('📧 Falling back to email simulation in development');
        await this.simulateEmailSend(emailData);
      } else {
        throw new Error('Failed to send invitation email');
      }
    }
  }

  /**
   * Send reminder email for pending invitation
   */
  async sendReminderEmail(invitation: OrganizationInvitation, organizationName: string, inviterName: string): Promise<void> {
    // Use the same template but with reminder subject
    const emailData: InvitationEmailData = {
      recipientEmail: invitation.email,
      recipientName: invitation.email.split('@')[0],
      organizationName: 'Your Organization', // You might want to pass this in
      inviterName: 'Your Team',
      inviterEmail: 'team@yourcompany.com',
      role: invitation.role,
      acceptUrl: `${this.baseUrl}/accept-invitation/${invitation.id}`,
      expiresAt: invitation.expires_at,
      invitationToken: invitation.token || invitation.id, // Use ID as fallback
      personalMessage: invitation.message || undefined,
    };

    try {
      if (!this.resendApiKey) {
        console.warn('Resend API key not configured. Falling back to simulation.');
        await this.simulateEmailSend(emailData);
        return;
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: [emailData.recipientEmail],
          subject: `Reminder: Invitation to join ${emailData.organizationName}`,
          html: this.generateReminderTemplate(emailData),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Resend API error: ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Reminder email sent successfully:', result.id);
      
    } catch (error) {
      console.error('❌ Failed to send reminder email:', error);
      
      // Fallback to simulation in development
      if (import.meta.env.DEV) {
        console.log('📧 Falling back to email simulation in development');
        await this.simulateEmailSend(emailData);
      } else {
        throw new Error('Failed to send reminder email');
      }
    }
  }

  /**
   * Generate invitation email HTML template
   */
  private generateEmailTemplate(data: InvitationEmailData): string {
    const expiresDate = new Date(data.expiresAt).toLocaleDateString();
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invitation to join ${data.organizationName}</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6; 
              color: #333; 
              margin: 0; 
              padding: 0; 
              background-color: #f6f9fc;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background-color: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header { 
              background: linear-gradient(135deg, #00A991 0%, #008A7A 100%); 
              color: white; 
              padding: 40px 30px; 
              text-align: center; 
            }
            .header h1 {
              margin: 0 0 10px 0;
              font-size: 24px;
              font-weight: 600;
            }
            .header p {
              margin: 0;
              opacity: 0.9;
              font-size: 16px;
            }
            .content { 
              padding: 40px 30px; 
            }
            .content h2 {
              color: #1a1a1a;
              font-size: 20px;
              margin: 0 0 20px 0;
            }
            .content p {
              margin: 0 0 16px 0;
              color: #4a5568;
              font-size: 16px;
            }
            .invite-details {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 20px;
              margin: 24px 0;
            }
            .invite-details h3 {
              margin: 0 0 12px 0;
              color: #2d3748;
              font-size: 16px;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              margin: 8px 0;
              font-size: 14px;
            }
            .detail-label {
              color: #718096;
            }
            .detail-value {
              color: #2d3748;
              font-weight: 500;
            }
            .role-badge {
              display: inline-block;
              padding: 4px 12px;
              background: #00A991;
              color: white;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 500;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .button { 
              display: inline-block; 
              background: #00A991; 
              color: white; 
              padding: 16px 32px; 
              text-decoration: none; 
              border-radius: 8px; 
              margin: 24px 0; 
              font-weight: 600;
              font-size: 16px;
              text-align: center;
              transition: background-color 0.2s;
            }
            .button:hover {
              background: #008A7A;
            }
            .permissions {
              background: #e6fffa;
              border: 1px solid #81e6d9;
              border-radius: 8px;
              padding: 20px;
              margin: 24px 0;
            }
            .permissions h3 {
              color: #00A991;
              margin: 0 0 12px 0;
              font-size: 16px;
            }
            .permissions ul {
              margin: 0;
              padding-left: 20px;
              color: #2d3748;
            }
            .permissions li {
              margin: 8px 0;
              font-size: 14px;
            }
            .footer { 
              background: #f8fafc;
              padding: 30px;
              border-top: 1px solid #e2e8f0;
              text-align: center;
            }
            .footer p {
              margin: 8px 0;
              font-size: 14px; 
              color: #718096;
            }
            .expiry-notice {
              background: #fff5f5;
              border: 1px solid #fed7d7;
              border-radius: 6px;
              padding: 12px;
              margin: 16px 0;
              font-size: 14px;
              color: #c53030;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>You're invited to join ${data.organizationName}!</h1>
              <p>Team collaboration made simple with SalesSheet.ai CRM</p>
            </div>
            
            <div class="content">
              <h2>Welcome!</h2>
              
              <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.organizationName}</strong> on SalesSheet.ai CRM.</p>
              
              <div class="invite-details">
                <h3>Invitation Details</h3>
                <div class="detail-row">
                  <span class="detail-label">Organization:</span>
                  <span class="detail-value">${data.organizationName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Your Role:</span>
                  <span class="detail-value"><span class="role-badge">${data.role}</span></span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Invited by:</span>
                  <span class="detail-value">${data.inviterName} (${data.inviterEmail})</span>
                </div>
              </div>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${data.acceptUrl}" class="button">Accept Invitation</a>
              </div>
              
              <div class="expiry-notice">
                ⏰ <strong>Important:</strong> This invitation will expire on ${expiresDate}.
              </div>
              
              <div class="permissions">
                <h3>What you can do as a ${data.role === 'admin' ? 'Administrator' : 'Team Member'}:</h3>
                <ul>
                  ${data.role === 'admin' 
                    ? `
                      <li>Manage team members and send invitations</li>
                      <li>Access all organization settings and billing</li>
                      <li>View, edit, and manage all contacts and data</li>
                      <li>Set up integrations and customize workflows</li>
                      <li>Generate reports and analytics</li>
                    `
                    : `
                      <li>View and edit contacts and customer data</li>
                      <li>Collaborate with team members on deals</li>
                      <li>Access shared lists, reports, and dashboards</li>
                      <li>Use email integration and automation features</li>
                      <li>Track activities and manage your pipeline</li>
                    `
                  }
                </ul>
              </div>
              
              <p>If you have any questions about this invitation, feel free to reach out to ${data.inviterName} at <a href="mailto:${data.inviterEmail}" style="color: #00A991;">${data.inviterEmail}</a>.</p>
            </div>
            
            <div class="footer">
              <p><strong>SalesSheet.ai</strong> - Customer Relationship Management Made Simple</p>
              <p>This invitation was sent by ${data.organizationName}.</p>
              <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate reminder email template
   */
  private generateReminderTemplate(data: InvitationEmailData): string {
    const template = this.generateEmailTemplate(data);
    return template.replace(
      'You\'re invited to join',
      'Reminder: You\'re invited to join'
    ).replace(
      '<h2>Welcome!</h2>',
      '<h2>Friendly Reminder</h2>'
    ).replace(
      'has invited you to join',
      'previously invited you to join'
    );
  }

  /**
   * Simulate email sending (for development)
   */
  private async simulateEmailSend(data: InvitationEmailData): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Log email content for development
    console.log('📧 Invitation Email Simulation:');
    console.log('To:', data.recipientEmail);
    console.log('Subject: Invitation to join', data.organizationName);
    console.log('Accept URL:', data.acceptUrl);
    console.log('Expires:', data.expiresAt);
    
    // In development, show the acceptance link for easy testing
    if (import.meta.env.DEV) {
      console.log('🔗 Test this invitation by visiting:', data.acceptUrl);
    }
  }
}

// Export singleton instance
export const invitationEmailService = new InvitationEmailService();

// Helper function to send invitations (used by the store)
export const sendInvitationEmails = async (invitations: OrganizationInvitation[], organizationName: string): Promise<void> => {
  const promises = invitations.map(invitation => 
    invitationEmailService.sendInvitationEmail(
      invitation, 
      organizationName, 
      invitation.inviter.first_name || invitation.inviter.email
    )
  );
  
  await Promise.all(promises);
}; 