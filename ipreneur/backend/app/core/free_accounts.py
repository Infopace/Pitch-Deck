"""A single, explicitly-requested billing exemption.

puneeth@gmail.com never pays for deck generation and never sees a price in
the UI. This is a one-off exception for that one address, not a general
"free accounts" mechanism — do not add another email here without the same
kind of explicit instruction naming it.
"""
_FREE_EMAILS = frozenset({"puneeth@gmail.com"})


def is_free_account(email: str) -> bool:
    return email.lower() in _FREE_EMAILS
