"""Tests for app.core.security — Fernet encrypt/decrypt/mask."""

from unittest.mock import patch

import pytest

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_fernet_key() -> str:
    from cryptography.fernet import Fernet

    return Fernet.generate_key().decode()


# ---------------------------------------------------------------------------
# encrypt / decrypt round-trip
# ---------------------------------------------------------------------------


class TestEncryptDecrypt:
    def test_roundtrip_basic(self):
        """encrypt then decrypt returns the original plaintext."""
        from app.core import security

        # Reset cached fernet so our key takes effect
        security._fernet = None

        key = _make_fernet_key()
        with patch("app.core.security.get_settings") as mock_settings:
            mock_settings.return_value.SECRET_FERNET_KEY = key
            security._fernet = None  # force re-init inside the call

            ciphertext = security.encrypt_value("my-secret-api-key")
            assert ciphertext != "my-secret-api-key"

            plaintext = security.decrypt_value(ciphertext)
            assert plaintext == "my-secret-api-key"

    def test_ciphertext_is_different_each_call(self):
        """Fernet uses a random IV so the same plaintext yields different ciphertext."""
        from app.core import security

        security._fernet = None
        key = _make_fernet_key()
        with patch("app.core.security.get_settings") as mock_settings:
            mock_settings.return_value.SECRET_FERNET_KEY = key
            security._fernet = None

            ct1 = security.encrypt_value("same-value")
            ct2 = security.encrypt_value("same-value")
            assert ct1 != ct2

    def test_decrypt_wrong_key_raises(self):
        """Decrypting with a different key must raise an exception."""
        from cryptography.fernet import InvalidToken

        from app.core import security

        key_a = _make_fernet_key()
        key_b = _make_fernet_key()

        # Encrypt with key_a
        security._fernet = None
        with patch("app.core.security.get_settings") as mock_settings:
            mock_settings.return_value.SECRET_FERNET_KEY = key_a
            security._fernet = None
            ciphertext = security.encrypt_value("secret")

        # Decrypt with key_b
        security._fernet = None
        with patch("app.core.security.get_settings") as mock_settings:
            mock_settings.return_value.SECRET_FERNET_KEY = key_b
            security._fernet = None
            with pytest.raises(InvalidToken):
                security.decrypt_value(ciphertext)


# ---------------------------------------------------------------------------
# mask_value
# ---------------------------------------------------------------------------


class TestMaskValue:
    def test_long_value_shows_last_four(self):
        from app.core.security import mask_value

        result = mask_value("sk-1234567890abcdef")
        assert result == "...cdef"

    def test_exactly_four_chars(self):
        from app.core.security import mask_value

        # 4 chars → should be entirely masked
        result = mask_value("abcd")
        assert result == "****"

    def test_fewer_than_four_chars(self):
        from app.core.security import mask_value

        result = mask_value("abc")
        assert result == "****"

    def test_empty_string(self):
        from app.core.security import mask_value

        result = mask_value("")
        assert result == "****"
