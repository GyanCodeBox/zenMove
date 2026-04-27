
import os
from app.utils.qr import render_qr_png, generate_qr_id

def create_test_stickers(city="BLR", count=5):
    # Create a directory for the stickers
    output_dir = "test_stickers"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    print(f"Generating {count} test stickers for {city}...")
    
    for i in range(1, count + 1):
        # Generate Tier 1 (PVC) format: ZM-2026-BLR-0000X
        qr_id = generate_qr_id(city, i, temporary=False)
        img_bytes = render_qr_png(qr_id)
        
        filename = f"{output_dir}/{qr_id}.png"
        with open(filename, "wb") as f:
            f.write(img_bytes)
        print(f"  [+] Saved {filename}")

if __name__ == "__main__":
    create_test_stickers()
    print("\nDone! You can find the QR images in the 'test_stickers' folder.")
