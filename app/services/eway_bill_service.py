"""
app/services/eway_bill_service.py
──────────────────────────────────
E-Way Bill generation via NIC API.

Current state: SANDBOX STUB
  - Returns a realistic mock EWB number and dates.
  - The full NIC API client is wired but gated by is_sandbox flag.

To go live:
  1. Set NIC_GSTIN, NIC_USERNAME, NIC_PASSWORD in .env
  2. Set NIC_SANDBOX=false in .env
  3. The _call_nic_api() method will then use real credentials.

NIC Sandbox URL: https://einvoice1-uat.nic.in/ewaybill/apiv1
NIC Prod URL:    https://einvoice1.nic.in/ewaybill/apiv1
"""

import json
import random
from datetime import datetime, timedelta, timezone
from uuid import UUID

import httpx

from app.core.config import get_settings
from app.core.exceptions import NotFoundError, ValidationError
from app.models.eway_bill import EWayBill
from app.models.move import Move
from app.schemas.eway_bill import EWayBillGenerateRequest, EWayBillResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

settings = get_settings()


class EWayBillService:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate(
        self, move_id: UUID, payload: EWayBillGenerateRequest
    ) -> EWayBillResponse:
        """
        Generate an E-Way Bill for an inter-state move.
        Mandatory before M2 escrow release.
        """
        move = await self.db.get(Move, move_id)
        if not move:
            raise NotFoundError(f"Move {move_id} not found.")

        # Check not already generated
        existing = await self.db.scalar(
            select(EWayBill).where(EWayBill.move_id == move_id)
        )
        if existing and existing.is_active:
            raise ValidationError(
                f"E-Way Bill already generated for this move (EWB: {existing.ewb_no})."
            )

        # Call NIC API (stubbed or real)
        nic_result = await self._call_nic_api(move, payload)

        ewb = EWayBill(
            move_id=move_id,
            ewb_no=nic_result["ewbNo"],
            ewb_date=nic_result["ewbDt"],
            valid_upto=nic_result["validUpto"],
            gstin_supplier=payload.gstin_supplier,
            gstin_recipient=payload.gstin_recipient,
            vehicle_no=payload.vehicle_no,
            distance_km=payload.distance_km,
            total_value=payload.total_value,
            nic_response=json.dumps(nic_result),
            is_sandbox=settings.nic_sandbox,
        )
        self.db.add(ewb)

        # Store EWB number on the move itself for quick access
        move.eway_bill_no = nic_result["ewbNo"]

        await self.db.flush()
        await self.db.refresh(ewb)
        return self._to_response(ewb)

    async def get(self, move_id: UUID) -> EWayBillResponse:
        ewb = await self.db.scalar(
            select(EWayBill).where(EWayBill.move_id == move_id)
        )
        if not ewb:
            raise NotFoundError("No E-Way Bill found for this move.")
        return self._to_response(ewb)

    # ── NIC API client ─────────────────────────────────────────────────

    async def _call_nic_api(
        self, move: Move, payload: EWayBillGenerateRequest
    ) -> dict:
        """
        Routes to stub or real NIC API based on NIC_SANDBOX env var.
        """
        if settings.nic_sandbox:
            return self._stub_response(payload)
        return await self._live_nic_request(move, payload)

    def _stub_response(self, payload: EWayBillGenerateRequest) -> dict:
        """
        Realistic sandbox stub.
        EWB number: 12 digits starting with '23' (NIC format).
        Valid for: distance-based validity (every 200km = 1 day, min 1 day).
        """
        ewb_no = "23" + str(random.randint(10**9, 10**10 - 1))
        now = datetime.now(timezone.utc)
        days_valid = max(1, payload.distance_km // 200)
        valid_upto = now + timedelta(days=days_valid)

        return {
            "ewbNo":      ewb_no,
            "ewbDt":      now.strftime("%d/%m/%Y %H:%M:%S"),
            "validUpto":  valid_upto.strftime("%d/%m/%Y %H:%M:%S"),
            "status":     "1",
            "alert":      "Generated via ZenMove Sandbox",
        }

    async def _live_nic_request(
        self, move: Move, payload: EWayBillGenerateRequest
    ) -> dict:
        """
        Real NIC E-Way Bill API call.
        Plug in credentials via NIC_USERNAME, NIC_PASSWORD, NIC_GSTIN in .env.

        NIC API Docs: https://einvoice1.nic.in/ewaybill/apiv1/doc
        Authentication: Token-based (get token first, then generate EWB).
        """
        base_url = settings.nic_api_url  # set in config

        async with httpx.AsyncClient(timeout=30) as client:
            # Step 1: Authenticate
            auth_res = await client.post(
                f"{base_url}/authenticate",
                json={
                    "UserName": settings.nic_username,
                    "Password": settings.nic_password,
                    "Gstin": settings.nic_gstin,
                },
            )
            auth_res.raise_for_status()
            token = auth_res.json()["Data"]["AuthToken"]

            # Step 2: Generate E-Way Bill
            ewb_res = await client.post(
                f"{base_url}/ewayapi/genewaybill",
                headers={"Authtoken": token, "Gstin": settings.nic_gstin},
                json={
                    "supplyType": "O",        # Outward
                    "subSupplyType": "1",      # Supply
                    "docType": "INV",
                    "docNo":   f"ZM-{str(move.id)[:8].upper()}",
                    "docDate": datetime.now().strftime("%d/%m/%Y"),
                    "fromGstin": payload.gstin_supplier,
                    "fromTrdName": "ZenMove Logistics",
                    "fromAddr1": move.origin_address[:100],
                    "fromPlace": move.origin_city_code,
                    "fromPincode": "751001",   # TODO: derive from address
                    "fromStateCode": "21",     # TODO: derive from city
                    "toGstin": payload.gstin_recipient,
                    "toTrdName": "ZenMove Customer",
                    "toAddr1": move.dest_address[:100],
                    "toPlace": move.dest_city_code,
                    "toPincode": "560001",
                    "toStateCode": "29",
                    "totalValue": payload.total_value,
                    "cgstValue": 0,
                    "sgstValue": 0,
                    "igstValue": round(payload.total_value * 0.18, 2),
                    "cessValue": 0,
                    "transporterName": "ZenMove",
                    "transDistance": str(payload.distance_km),
                    "vehicleNo": payload.vehicle_no,
                    "vehicleType": "R",       # Regular
                    "transMode": "1",          # Road
                    "itemList": [{
                        "itemNo": 1,
                        "productName": "Household Goods",
                        "hsnCode": "9965",
                        "quantity": 1,
                        "qtyUnit": "BOX",
                        "taxableAmount": payload.total_value,
                        "igstRate": 18,
                    }],
                },
            )
            ewb_res.raise_for_status()
            return ewb_res.json()["Data"]

    def _to_response(self, ewb: EWayBill) -> EWayBillResponse:
        return EWayBillResponse(
            id=ewb.id,
            move_id=ewb.move_id,
            ewb_no=ewb.ewb_no,
            ewb_date=ewb.ewb_date,
            valid_upto=ewb.valid_upto,
            vehicle_no=ewb.vehicle_no,
            distance_km=ewb.distance_km,
            total_value=ewb.total_value,
            is_sandbox=ewb.is_sandbox,
            is_active=ewb.is_active,
            generated_at=ewb.generated_at,
        )
