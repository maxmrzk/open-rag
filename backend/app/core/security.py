"""Fernet symmetric encryption helpers for API key secrets."""

from app.core.config import get_settings

_fernet = None


def _get_fernet():
    global _fernet
    if _fernet is None:
        from cryptography.fernet import Fernet

        settings = get_settings()
        key = settings.SECRET_FERNET_KEY
        if not key:
            # In dev, generate a temporary key (not persistent across restarts)
            key = Fernet.generate_key().decode()
        _fernet = Fernet(key.encode() if isinstance(key, str) else key)
    return _fernet


def encrypt_value(plaintext: str) -> str:
    """Encrypt a secret value. Returns base64-encoded ciphertext."""
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext: str) -> str:
    """Decrypt a previously encrypted value."""
    return _get_fernet().decrypt(ciphertext.encode()).decode()


def mask_value(plaintext: str) -> str:
    """Return a masked representation showing only the last 4 characters."""
    if len(plaintext) <= 4:
        return "****"
    return "..." + plaintext[-4:]
