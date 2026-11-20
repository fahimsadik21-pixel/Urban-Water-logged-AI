import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

def create_thumbnail_1():
    os.makedirs("thumbnails", exist_ok=True)
    width, height = 1280, 720
    
    # Base background: Mirpur 10 metro flood image
    bg_path = "frontend/public/slideshow/dhaka_mirpur_10_metro.jpg"
    if not os.path.exists(bg_path):
        bg_path = "frontend/public/slideshow/dhaka_bijoy_sarani.jpg"
        
    bg_img = Image.open(bg_path).convert("RGBA")
    bg_img = bg_img.resize((width, height), Image.Resampling.LANCZOS)
    
    # Slight blur on background for depth of field and enhance contrast
    enhancer = ImageEnhance.Contrast(bg_img)
    bg_img = enhancer.enhance(1.15)
    
    # Create dark gradient overlay on left for readable typography, and cyber tint
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    
    # Horizontal gradient: Left is heavy dark blue/black (0.95 opacity), right is semi-transparent dark (0.45 opacity)
    for x in range(width):
        factor = x / width
        if factor < 0.55:
            alpha = int(245 - factor * 80) # ~245 down to 200
        else:
            alpha = int(200 - (factor - 0.55) * 250)
            alpha = max(110, alpha)
        
        # Deep blue-green corporate tint
        overlay_draw.line([(x, 0), (x, height)], fill=(10, 22, 28, alpha))
        
    # Top and bottom vignette
    for y in range(height):
        if y < 100:
            top_alpha = int((100 - y) * 1.2)
            overlay_draw.line([(0, y), (width, y)], fill=(5, 10, 15, top_alpha))
        elif y > height - 120:
            bot_alpha = int((y - (height - 120)) * 1.5)
            overlay_draw.line([(0, y), (width, y)], fill=(5, 10, 15, bot_alpha))
            
    # Composite background and overlay
    canvas = Image.alpha_composite(bg_img, overlay)
    draw = ImageDraw.Draw(canvas)
    
    # Fonts
    win_fonts = os.path.join(os.environ.get('WINDIR', 'C:\\Windows'), 'Fonts')
    font_impact = os.path.join(win_fonts, 'impact.ttf')
    font_arialbd = os.path.join(win_fonts, 'arialbd.ttf')
    font_segoeuib = os.path.join(win_fonts, 'segoeuib.ttf')
    
    f_badge = ImageFont.truetype(font_segoeuib, 20)
    f_title_sub = ImageFont.truetype(font_segoeuib, 32)
    f_title_main = ImageFont.truetype(font_impact, 74)
    f_tagline = ImageFont.truetype(font_arialbd, 26)
    f_pills = ImageFont.truetype(font_arialbd, 20)
    f_hud_title = ImageFont.truetype(font_arialbd, 18)
    f_hud_val = ImageFont.truetype(font_segoeuib, 22)
    f_hud_bold = ImageFont.truetype(font_impact, 34)

    # 1. Top Left Live Badge
    badge_x, badge_y = 60, 50
    badge_text = "● LIVE VIDEO DEMO • DHAKA CIVIC TECH"
    draw.rounded_rectangle([badge_x, badge_y, badge_x + 400, badge_y + 40], radius=8, fill=(220, 38, 38, 230), outline=(254, 202, 202), width=1)
    draw.text((badge_x + 20, badge_y + 8), badge_text, font=f_badge, fill=(255, 255, 255))
    
    # 2. Main Title Line 1 (Green / Cyan Highlight)
    y_pos = 115
    draw.text((62, y_pos + 2), "AI-POWERED CIVIC INFRASTRUCTURE", font=f_title_sub, fill=(0, 0, 0, 180))
    draw.text((60, y_pos), "AI-POWERED CIVIC INFRASTRUCTURE", font=f_title_sub, fill=(52, 211, 153)) # Emerald green
    
    # Main Title Line 2 (Giant IMPACT)
    y_pos += 45
    # Shadow
    draw.text((64, y_pos + 4), "URBAN WATER-LOGGED AI", font=f_title_main, fill=(0, 0, 0, 230))
    # Main Text
    draw.text((60, y_pos), "URBAN WATER-LOGGED AI", font=f_title_main, fill=(255, 255, 255))
    
    # Main Title Line 3: Accent banner
    y_pos += 85
    banner_w = 640
    draw.rounded_rectangle([60, y_pos, 60 + banner_w, y_pos + 52], radius=10, fill=(16, 185, 129, 230)) # Teal/Emerald
    draw.text((80, y_pos + 11), "DHAKA FLOOD INTEL & SMART DEWATERING", font=f_tagline, fill=(10, 25, 20))
    
    # 3. Key Feature Bullets / Pills (Vertical stack on left)
    y_pos += 75
    features = [
        ("⚡ 95.3% AI Accuracy", "Dual Ultrasonic + Rain Forecasting", (14, 165, 233)), # Sky blue
        ("👁️ Real-Time Computer Vision", "CCTV Water & Debris Segmentation", (168, 85, 247)), # Purple
        ("🛡️ 12 Hardware Safety Interlocks", "Anti-Dry Run, Canal Anti-Backflow", (245, 158, 11)), # Amber
    ]
    
    for f_title, f_desc, color in features:
        # Pill card
        pill_w, pill_h = 580, 56
        draw.rounded_rectangle([60, y_pos, 60 + pill_w, y_pos + pill_h], radius=8, fill=(15, 23, 42, 220), outline=color, width=2)
        
        # Color bar indicator
        draw.rectangle([60, y_pos + 6, 68, y_pos + pill_h - 6], fill=color)
        
        # Text
        draw.text((82, y_pos + 8), f_title, font=f_pills, fill=(255, 255, 255))
        draw.text((82, y_pos + 31), f_desc, font=ImageFont.truetype(font_segoeuib, 16), fill=(148, 163, 184))
        y_pos += 68

    # Bottom Tagline
    draw.text((60, 630), "Citizen Early Warnings  •  Regional Operations  •  Tamper-Evident Audit", font=ImageFont.truetype(font_arialbd, 18), fill=(203, 213, 225))
    
    # 4. Right Side: Futuristic AI HUD & Real-Time Telemetry Card
    hud_x = 730
    hud_y = 110
    hud_w = 490
    hud_h = 500
    
    # Draw glassmorphic HUD box
    hud_overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    hud_draw = ImageDraw.Draw(hud_overlay)
    hud_draw.rounded_rectangle([hud_x, hud_y, hud_x + hud_w, hud_y + hud_h], radius=16, fill=(10, 25, 40, 210), outline=(56, 189, 248, 200), width=3)
    
    # Corner HUD crosshairs
    ch_len = 24
    hud_draw.line([(hud_x, hud_y), (hud_x + ch_len, hud_y)], fill=(56, 189, 248), width=4)
    hud_draw.line([(hud_x, hud_y), (hud_x, hud_y + ch_len)], fill=(56, 189, 248), width=4)
    hud_draw.line([(hud_x + hud_w, hud_y), (hud_x + hud_w - ch_len, hud_y)], fill=(56, 189, 248), width=4)
    hud_draw.line([(hud_x + hud_w, hud_y), (hud_x + hud_w, hud_y + ch_len)], fill=(56, 189, 248), width=4)
    hud_draw.line([(hud_x, hud_y + hud_h), (hud_x + ch_len, hud_y + hud_h)], fill=(56, 189, 248), width=4)
    hud_draw.line([(hud_x, hud_y + hud_h), (hud_x, hud_y + hud_h - ch_len)], fill=(56, 189, 248), width=4)
    hud_draw.line([(hud_x + hud_w, hud_y + hud_h), (hud_x + hud_w - ch_len, hud_y + hud_h)], fill=(56, 189, 248), width=4)
    hud_draw.line([(hud_x + hud_w, hud_y + hud_h), (hud_x + hud_w, hud_y + hud_h - ch_len)], fill=(56, 189, 248), width=4)
    
    canvas = Image.alpha_composite(canvas, hud_overlay)
    draw = ImageDraw.Draw(canvas)
    
    # Inside HUD Card:
    # Header
    draw.text((hud_x + 25, hud_y + 25), "LOCATION: MIRPUR-10 METRO INTERSECTION", font=f_hud_title, fill=(56, 189, 248))
    draw.text((hud_x + 25, hud_y + 50), "SURFACE WATER: 34.2 cm", font=f_hud_bold, fill=(239, 68, 68)) # High water depth
    
    # Progress / Risk Bar
    bar_y = hud_y + 100
    draw.text((hud_x + 25, bar_y), "FLOOD RISK: SEVERE (PASSABILITY 12%)", font=f_hud_title, fill=(251, 146, 60))
    draw.rounded_rectangle([hud_x + 25, bar_y + 25, hud_x + hud_w - 25, bar_y + 40], radius=6, fill=(30, 41, 59))
    draw.rounded_rectangle([hud_x + 25, bar_y + 25, hud_x + 380, bar_y + 40], radius=6, fill=(239, 68, 68))
    
    # 4 Telemetry Metrics Grid
    grid_y = bar_y + 60
    metrics = [
        ("CCTV Segmentation", "WATER 78% | DEBRIS 22%", (52, 211, 153)),
        ("Downstream Canal", "Kallyanpur Canal 62% (PASS)", (56, 189, 248)),
        ("Dewatering Pump", "MOBILE UNIT #04 ARMED", (250, 204, 21)),
        ("Hardware Interlocks", "12 of 12 GATES VERIFIED", (34, 197, 94)),
    ]
    
    for label, val, c in metrics:
        draw.rounded_rectangle([hud_x + 25, grid_y, hud_x + hud_w - 25, grid_y + 54], radius=8, fill=(15, 23, 42, 190), outline=(51, 65, 85), width=1)
        draw.text((hud_x + 40, grid_y + 8), label, font=ImageFont.truetype(font_arialbd, 14), fill=(148, 163, 184))
        draw.text((hud_x + 40, grid_y + 27), val, font=ImageFont.truetype(font_segoeuib, 17), fill=c)
        grid_y += 64

    # Bottom Safety Seal Stamp
    draw.rounded_rectangle([hud_x + 25, hud_y + hud_h - 75, hud_x + hud_w - 25, hud_y + hud_h - 20], radius=8, fill=(22, 101, 52, 220), outline=(74, 222, 128), width=2)
    draw.text((hud_x + 45, hud_y + hud_h - 62), "🔒 TAMPER-EVIDENT LEDGER SEALED: SHA-256 VALID", font=ImageFont.truetype(font_arialbd, 16), fill=(240, 253, 244))

    # Outer Border Frame
    border_color = (16, 185, 129, 255) # Emerald Green Accent
    draw.rectangle([0, 0, width - 1, height - 1], outline=border_color, width=6)
    
    out_path = "thumbnails/youtube_thumbnail_primary.png"
    canvas.save(out_path, "PNG", quality=95)
    print(f"Generated {out_path} ({width}x{height}) successfully.")
    return out_path

if __name__ == "__main__":
    create_thumbnail_1()
