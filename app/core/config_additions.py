"""
ADD THESE FIELDS to your existing Settings class in app/core/config.py
Copy-paste into the Settings class body.
"""

# ── Redis ──────────────────────────────────────────────────────────────────
redis_url: str = "redis://localhost:6379/0"

# ── NIC E-Way Bill ─────────────────────────────────────────────────────────
nic_sandbox: bool = True
nic_api_url: str = "https://einvoice1-uat.nic.in/ewaybill/apiv1"
nic_gstin: str = ""
nic_username: str = ""
nic_password: str = ""

# ── Razorpay (mock in Phase 2) ─────────────────────────────────────────────
razorpay_key_id: str = ""
razorpay_key_secret: str = ""
razorpay_webhook_secret: str = ""

# ── Platform fee ───────────────────────────────────────────────────────────
platform_fee_pct: float = 10.0
