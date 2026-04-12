"""
tests/unit/test_qr_utils.py
────────────────────────────
Unit tests for QR ID generation and validation logic.
These test pure functions — no DB, no HTTP.
"""

import pytest

from app.utils.qr import generate_qr_id, hash_file_bytes, is_valid_qr_format, render_qr_png


class TestGenerateQRId:
    def test_standard_pvc_format(self):
        qr_id = generate_qr_id(city_code="BBS", serial=1)
        parts = qr_id.split("-")
        assert parts[0] == "ZM"
        assert len(parts[1]) == 4       # year
        assert parts[2] == "BBS"
        assert parts[3] == "00001"

    def test_temporary_paper_format(self):
        qr_id = generate_qr_id(city_code="BLR", serial=42, temporary=True)
        assert "-T-" in qr_id
        assert qr_id.endswith("00042")

    def test_city_code_uppercased(self):
        qr_id = generate_qr_id(city_code="bbs", serial=1)
        assert "BBS" in qr_id

    def test_serial_zero_padded_to_5_digits(self):
        qr_id = generate_qr_id(city_code="BBS", serial=999)
        assert qr_id.endswith("00999")

    def test_large_serial(self):
        qr_id = generate_qr_id(city_code="BBS", serial=99999)
        assert qr_id.endswith("99999")


class TestIsValidQRFormat:
    def test_valid_pvc_code(self):
        assert is_valid_qr_format("ZM-2026-BBS-00001") is True

    def test_valid_paper_code(self):
        assert is_valid_qr_format("ZM-2026-BBS-T-00001") is True

    def test_wrong_prefix(self):
        assert is_valid_qr_format("XX-2026-BBS-00001") is False

    def test_too_short(self):
        assert is_valid_qr_format("ZM-26") is False

    def test_non_numeric_year(self):
        assert is_valid_qr_format("ZM-ABCD-BBS-00001") is False

    def test_empty_string(self):
        assert is_valid_qr_format("") is False


class TestHashFileBytes:
    def test_known_hash(self):
        # SHA-256 of empty bytes is well-known
        result = hash_file_bytes(b"")
        assert result == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

    def test_deterministic(self):
        data = b"ZenMove test photo content"
        assert hash_file_bytes(data) == hash_file_bytes(data)

    def test_different_data_different_hash(self):
        assert hash_file_bytes(b"abc") != hash_file_bytes(b"xyz")

    def test_returns_64_char_hex(self):
        result = hash_file_bytes(b"test")
        assert len(result) == 64
        assert all(c in "0123456789abcdef" for c in result)


class TestRenderQRPng:
    def test_returns_bytes(self):
        png = render_qr_png("ZM-2026-BBS-00001")
        assert isinstance(png, bytes)
        assert len(png) > 0

    def test_png_header(self):
        """PNG files start with the 8-byte PNG signature."""
        png = render_qr_png("ZM-2026-BBS-T-00001")
        assert png[:8] == b"\x89PNG\r\n\x1a\n"
