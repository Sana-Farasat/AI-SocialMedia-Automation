import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    """Send a password reset email over SMTP. Requires SMTP_* settings."""
    subject = f"Reset your {settings.APP_NAME} password"
    body = (
        f"Hi,\n\n"
        f"You requested a password reset for your {settings.APP_NAME} account.\n"
        f"Click the link below to choose a new password "
        f"(expires in {settings.PASSWORD_RESET_TOKEN_MINUTES} minutes):\n\n"
        f"{reset_link}\n\n"
        f"If you did not request this, you can safely ignore this email."
    )
    msg = MIMEMultipart()
    msg["From"] = settings.MAIL_FROM
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.MAIL_FROM, [to_email], msg.as_string())