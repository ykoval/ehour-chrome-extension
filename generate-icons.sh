#!/bin/bash

# eHour Chrome Extension - Icon Generation Script
# This script converts the SVG icon to the required PNG sizes

echo "🎨 Generating Chrome Extension Icons..."

# Check if we have the required tools
if ! command -v rsvg-convert &> /dev/null; then
    echo "❌ rsvg-convert not found. Installing..."
    
    # Check OS and install accordingly
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install librsvg
        else
            echo "Please install Homebrew first: https://brew.sh"
            echo "Then run: brew install librsvg"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo apt-get update
        sudo apt-get install librsvg2-bin
    else
        echo "Please install librsvg manually for your OS"
        exit 1
    fi
fi

# Create icons directory if it doesn't exist
mkdir -p icons

# Generate PNG icons from SVG
echo "📐 Converting SVG to PNG icons..."

# 16x16 icon
rsvg-convert -w 16 -h 16 icons/icon.svg -o icons/icon16.png
echo "✅ Generated icon16.png"

# 48x48 icon  
rsvg-convert -w 48 -h 48 icons/icon.svg -o icons/icon48.png
echo "✅ Generated icon48.png"

# 128x128 icon
rsvg-convert -w 128 -h 128 icons/icon.svg -o icons/icon128.png
echo "✅ Generated icon128.png"

echo ""
echo "🎉 All icons generated successfully!"
echo ""
echo "📁 Generated files:"
echo "   icons/icon16.png  (16x16 - toolbar)"
echo "   icons/icon48.png  (48x48 - extension management)"  
echo "   icons/icon128.png (128x128 - Chrome Web Store)"
echo ""
echo "🚀 Your Chrome extension is now ready to install!"
echo ""
echo "📋 Next steps:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode' (toggle in top right)"
echo "3. Click 'Load unpacked' and select this folder"
echo "4. The extension should appear with your custom icon!"
