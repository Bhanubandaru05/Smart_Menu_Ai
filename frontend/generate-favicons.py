"""
Generate PNG favicons from SVG logo for MenuAI
Requires: pip install cairosvg pillow
"""

try:
    import cairosvg
    from PIL import Image
    import io
    
    svg_path = "public/menuai-logo.svg"
    
    # Generate 192x192 PNG
    png_192 = cairosvg.svg2png(url=svg_path, output_width=192, output_height=192)
    with open("public/menuai-192.png", "wb") as f:
        f.write(png_192)
    print("✅ Generated menuai-192.png")
    
    # Generate 512x512 PNG
    png_512 = cairosvg.svg2png(url=svg_path, output_width=512, output_height=512)
    with open("public/menuai-512.png", "wb") as f:
        f.write(png_512)
    print("✅ Generated menuai-512.png")
    
    # Generate favicon.ico (multi-size)
    img_512 = Image.open(io.BytesIO(png_512))
    img_512.save("public/favicon.ico", format="ICO", sizes=[(16,16), (32,32), (48,48)])
    print("✅ Generated favicon.ico")
    
    print("\n🎉 All favicon files generated successfully!")
    print("Files created:")
    print("  - public/menuai-192.png")
    print("  - public/menuai-512.png")
    print("  - public/favicon.ico")
    
except ImportError:
    print("❌ Required packages not installed")
    print("\nInstall with:")
    print("  pip install cairosvg pillow")
    print("\nOr use online converter:")
    print("  https://cloudconvert.com/svg-to-png")
    
except Exception as e:
    print(f"❌ Error: {e}")
    print("\nAlternative: Use online converter at https://cloudconvert.com/svg-to-png")
