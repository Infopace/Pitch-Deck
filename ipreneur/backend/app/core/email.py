"""Transactional email via SMTP.

smtplib is blocking — there's no async SMTP client in the standard library —
so the actual send runs in a worker thread via asyncio.to_thread rather than
stalling the event loop for the duration of the SMTP handshake.
"""
import asyncio
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from loguru import logger

from app.core.config import settings


def _send_sync(to: str, subject: str, html: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from_email
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))

    if settings.smtp_use_ssl:
        server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=10)
    else:
        server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10)
    try:
        if not settings.smtp_use_ssl:
            server.starttls()
        if settings.smtp_username:
            server.login(settings.smtp_username, settings.smtp_password)
        server.sendmail(settings.smtp_from_email, [to], msg.as_string())
    finally:
        server.quit()


async def send_email(to: str, subject: str, html: str) -> bool:
    """True if the SMTP server accepted the send.

    False — logged, never raised — when it isn't configured or the send
    fails. Callers decide whether that should block the request; the OTP
    endpoints don't, so a misconfigured account degrades to "no email
    arrives" rather than a 500 on every signup.
    """
    if not settings.smtp_host:
        logger.warning(f"SMTP_HOST not set — skipped sending {subject!r} to {to}")
        return False

    try:
        await asyncio.to_thread(_send_sync, to, subject, html)
        return True
    except Exception as exc:
        logger.error(f"SMTP send to {to} raised: {exc}")
        return False
