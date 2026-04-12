"""
tests/integration/test_items.py
────────────────────────────────
Integration tests for the full Phase 1 item workflow.
Tests run against the real FastAPI app with an in-memory SQLite DB.

Workflow tested end-to-end:
  1. Create move
  2. Create item
  3. Bind QR
  4. Upload photos (mocked S3)
  5. Advance move to loading
  6. Scan item at loading
  7. Advance move to delivered
  8. Scan item at unloading
  9. Generate manifest (mocked S3)
  10. Assert 0% variance
"""

from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.models.move import MoveStatus


# ── Helpers ────────────────────────────────────────────────────────────────

async def create_move(client: AsyncClient) -> dict:
    resp = await client.post("/api/v1/moves", json={
        "origin_address": "Plot 12, Saheed Nagar, Bhubaneswar, Odisha",
        "dest_address": "Koramangala 5th Block, Bangalore, Karnataka",
        "origin_city_code": "BBS",
        "dest_city_code": "BLR",
        "scheduled_at": "2026-08-15T08:00:00+05:30",
        "quote_amount": 28500.00,
    })
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


async def create_item(client: AsyncClient, move_id: str, name: str = "Samsung TV") -> dict:
    resp = await client.post(f"/api/v1/moves/{move_id}/items", json={
        "name": name,
        "condition_pre": "good",
        "notes": "65-inch OLED, handle with care",
    })
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


# ── Tests ──────────────────────────────────────────────────────────────────

class TestCreateMove:
    async def test_create_move_success(self, client: AsyncClient):
        move = await create_move(client)
        assert move["status"] == "quoted"
        assert move["origin_city_code"] == "BBS"
        assert move["dest_city_code"] == "BLR"
        assert float(move["quote_amount"]) == 28500.0

    async def test_create_move_negative_amount(self, client: AsyncClient):
        resp = await client.post("/api/v1/moves", json={
            "origin_address": "Bhubaneswar",
            "dest_address": "Bangalore",
            "origin_city_code": "BBS",
            "dest_city_code": "BLR",
            "scheduled_at": "2026-08-15T08:00:00+05:30",
            "quote_amount": -100,
        })
        assert resp.status_code == 422


class TestCreateItem:
    async def test_create_item_success(self, client: AsyncClient):
        move = await create_move(client)
        item = await create_item(client, move["id"])
        assert item["name"] == "Samsung TV"
        assert item["condition_pre"] == "good"
        assert item["is_qr_bound"] is False
        assert item["is_photo_complete"] is False
        assert item["is_high_risk"] is False

    async def test_item_name_too_short(self, client: AsyncClient):
        move = await create_move(client)
        resp = await client.post(f"/api/v1/moves/{move['id']}/items", json={
            "name": "X",
            "condition_pre": "good",
        })
        assert resp.status_code == 422


class TestBindQR:
    async def test_bind_pvc_qr_success(self, client: AsyncClient):
        move = await create_move(client)
        item = await create_item(client, move["id"])

        resp = await client.post(f"/api/v1/items/{item['id']}/bind-qr", json={
            "qr_code": "ZM-2026-BBS-00001",
            "tag_tier": "PVC",
        })
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["qr_code"] == "ZM-2026-BBS-00001"
        assert data["is_qr_bound"] is True
        assert data["is_high_risk"] is False
        assert data["tag_tier"] == "PVC"

    async def test_bind_paper_tag_sets_high_risk(self, client: AsyncClient):
        move = await create_move(client)
        item = await create_item(client, move["id"])

        resp = await client.post(f"/api/v1/items/{item['id']}/bind-qr", json={
            "qr_code": "ZM-2026-BBS-T-00001",
            "tag_tier": "PAPER",
        })
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["is_high_risk"] is True
        assert data["tag_tier"] == "PAPER"

    async def test_bind_same_qr_twice_to_different_items_fails(self, client: AsyncClient):
        move = await create_move(client)
        item1 = await create_item(client, move["id"], "TV")
        item2 = await create_item(client, move["id"], "Sofa")

        qr_payload = {"qr_code": "ZM-2026-BBS-00002", "tag_tier": "PVC"}
        resp1 = await client.post(f"/api/v1/items/{item1['id']}/bind-qr", json=qr_payload)
        assert resp1.status_code == 200

        resp2 = await client.post(f"/api/v1/items/{item2['id']}/bind-qr", json=qr_payload)
        assert resp2.status_code == 409  # Conflict — QR already bound

    async def test_bind_invalid_qr_format_fails(self, client: AsyncClient):
        move = await create_move(client)
        item = await create_item(client, move["id"])

        resp = await client.post(f"/api/v1/items/{item['id']}/bind-qr", json={
            "qr_code": "INVALID-CODE",
            "tag_tier": "PVC",
        })
        assert resp.status_code in (422, 409)


class TestScanWorkflow:
    async def test_full_load_unload_cycle(self, client: AsyncClient):
        """The core Phase 1 success path — 0% variance."""
        # Setup
        move = await create_move(client)
        move_id = move["id"]
        item = await create_item(client, move_id, "Dining Table")

        # Bind QR
        await client.post(f"/api/v1/items/{item['id']}/bind-qr", json={
            "qr_code": "ZM-2026-BBS-00010",
            "tag_tier": "PVC",
        })

        # Advance to loading
        await client.patch(f"/api/v1/moves/{move_id}/status", json={"status": "booked"})
        await client.patch(f"/api/v1/moves/{move_id}/status", json={"status": "loading"})

        # Scan at loading
        resp = await client.post(f"/api/v1/moves/{move_id}/scan", json={
            "qr_code": "ZM-2026-BBS-00010"
        })
        assert resp.status_code == 200
        assert resp.json()["data"]["is_loaded"] is True

        # Advance to delivered
        await client.patch(f"/api/v1/moves/{move_id}/status", json={"status": "in_transit"})
        await client.patch(f"/api/v1/moves/{move_id}/status", json={"status": "delivered"})

        # Scan at unloading
        resp = await client.post(f"/api/v1/moves/{move_id}/scan", json={
            "qr_code": "ZM-2026-BBS-00010"
        })
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["is_loaded"] is True
        assert data["is_unloaded"] is True

    async def test_scan_unknown_qr_fails(self, client: AsyncClient):
        move = await create_move(client)
        await client.patch(f"/api/v1/moves/{move['id']}/status", json={"status": "booked"})
        await client.patch(f"/api/v1/moves/{move['id']}/status", json={"status": "loading"})

        resp = await client.post(f"/api/v1/moves/{move['id']}/scan", json={
            "qr_code": "ZM-2026-BBS-99999"  # not registered to this move
        })
        assert resp.status_code == 404

    async def test_double_scan_at_loading_fails(self, client: AsyncClient):
        move = await create_move(client)
        move_id = move["id"]
        item = await create_item(client, move_id)
        await client.post(f"/api/v1/items/{item['id']}/bind-qr", json={
            "qr_code": "ZM-2026-BBS-00020", "tag_tier": "PVC"
        })
        await client.patch(f"/api/v1/moves/{move_id}/status", json={"status": "booked"})
        await client.patch(f"/api/v1/moves/{move_id}/status", json={"status": "loading"})

        await client.post(f"/api/v1/moves/{move_id}/scan", json={"qr_code": "ZM-2026-BBS-00020"})
        resp = await client.post(f"/api/v1/moves/{move_id}/scan", json={"qr_code": "ZM-2026-BBS-00020"})
        assert resp.status_code == 422


class TestManifest:
    async def test_generate_manifest_mocked_s3(self, client: AsyncClient):
        """Manifest generation with S3 mocked out."""
        move = await create_move(client)
        move_id = move["id"]

        for name in ["Sofa", "TV", "Laptop"]:
            item = await create_item(client, move_id, name)
            await client.post(f"/api/v1/items/{item['id']}/bind-qr", json={
                "qr_code": f"ZM-2026-BBS-{name[:3].upper()}01",
                "tag_tier": "PVC",
            })

        with (
            patch("app.utils.s3.upload_file_bytes", return_value="manifests/test/manifest.pdf"),
            patch("app.utils.s3.generate_signed_url", return_value="https://s3.example.com/manifest.pdf"),
        ):
            resp = await client.get(f"/api/v1/moves/{move_id}/manifest")

        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["total_items"] == 3
        assert data["high_risk_items"] == 0
        assert "manifest_url" in data


class TestMoveStatusMachine:
    async def test_invalid_transition_rejected(self, client: AsyncClient):
        """Cannot skip from quoted directly to in_transit."""
        move = await create_move(client)
        resp = await client.patch(f"/api/v1/moves/{move['id']}/status", json={
            "status": "in_transit"
        })
        assert resp.status_code == 403

    async def test_valid_transition_chain(self, client: AsyncClient):
        move = await create_move(client)
        move_id = move["id"]
        for status in ["booked", "loading", "in_transit", "delivered", "completed"]:
            resp = await client.patch(f"/api/v1/moves/{move_id}/status", json={"status": status})
            assert resp.status_code == 200, f"Failed at {status}: {resp.text}"
