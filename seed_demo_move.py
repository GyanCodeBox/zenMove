import asyncio
from sqlalchemy import select
from datetime import datetime, timezone, timedelta
from app.db.session import AsyncSessionLocal
from app.models.move import Move, MoveStatus
from app.models.user import User

async def seed():
    async with AsyncSessionLocal() as db:
        packer = await db.scalar(select(User).where(User.phone == '9999999999'))
        if not packer: 
            print("Packer not found")
            return
            
        move = Move(
            customer_id=packer.id,
            vendor_id=packer.id,
            status=MoveStatus.booked,
            origin_address="Tower 3, Brigade Gateway, Bangalore",
            dest_address="DLF Phase 4, Gurgaon",
            origin_city_code="BLR",
            dest_city_code="DEL",
            scheduled_at=datetime.now(timezone.utc) + timedelta(days=1),
            quote_amount=45000.00
        )
        db.add(move)
        await db.commit()
        print("Demo Move created successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
