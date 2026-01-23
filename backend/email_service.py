"""
Email service using Resend for sending transactional emails.
"""
import resend
from config import settings


def send_password_reset_email(to_email: str, reset_url: str, display_name: str) -> bool:
    """
    Send a password reset email to the user.

    Args:
        to_email: User's email address
        reset_url: Full URL for password reset (with token)
        display_name: User's display name for personalization

    Returns:
        True if email sent successfully, False otherwise
    """
    if not settings.resend_api_key:
        print("Warning: RESEND_API_KEY not configured, skipping email send")
        return False

    resend.api_key = settings.resend_api_key

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #667eea; margin: 0;">Stork Pool</h1>
        </div>

        <div style="background: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; color: #333;">Reset Your Password</h2>
            <p>Hi {display_name},</p>
            <p>We received a request to reset your password for your Stork Pool account. Click the button below to create a new password:</p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Reset Password</a>
            </div>

            <p style="color: #666; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
        </div>

        <div style="text-align: center; color: #999; font-size: 12px;">
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #667eea;">{reset_url}</p>
        </div>
    </body>
    </html>
    """

    try:
        resend.Emails.send({
            "from": "Stork Pool <noreply@reset.storkpool.com>",
            "to": to_email,
            "subject": "Reset Your Stork Pool Password",
            "html": html_content
        })
        return True
    except Exception as e:
        print(f"Failed to send password reset email: {e}")
        return False
