#!/usr/bin/env python3
"""
FloatingChat Icon Generator

Generates high-quality icons for the FloatingChat Chrome extension.
Creates clean, modern chat window icons with proper scaling for all required sizes.

@author Simon Zeng
@version 1.0.0
@email simon7108528@gmail.com

Usage:
    python generate_icons.py

Requirements:
    - python 3.6+
    - cairosvg (optional, for high-quality PNG conversion)
"""

import os
import sys
from xml.etree.ElementTree import Element, SubElement, tostring
import xml.etree.ElementTree as ET

# Try to import cairosvg for high-quality PNG conversion
try:
    import cairosvg
    CAIRO_AVAILABLE = True
    print("✅ cairosvg available - will generate high-quality PNGs")
except ImportError:
    CAIRO_AVAILABLE = False
    print("⚠️  cairosvg not available. Installing...")
    try:
        os.system("pip install cairosvg")
        import cairosvg
        CAIRO_AVAILABLE = True
        print("✅ cairosvg installed successfully")
    except ImportError:
        print("❌ Could not install cairosvg. Will generate SVG only.")
        print("💡 Install manually with: pip install cairosvg")

def create_chat_window_svg():
    """Create a clean, simple chat window SVG"""
    
    # Create SVG root
    svg = Element('svg')
    svg.set('width', '128')
    svg.set('height', '128')
    svg.set('viewBox', '0 0 128 128')
    svg.set('xmlns', 'http://www.w3.org/2000/svg')
    
    # Add definitions for gradients and filters
    defs = SubElement(svg, 'defs')
    
    # Background gradient - clean iOS blue
    gradient = SubElement(defs, 'linearGradient')
    gradient.set('id', 'bgGradient')
    gradient.set('x1', '0%')
    gradient.set('y1', '0%')
    gradient.set('x2', '0%')
    gradient.set('y2', '100%')
    
    stop1 = SubElement(gradient, 'stop')
    stop1.set('offset', '0%')
    stop1.set('stop-color', '#007AFF')
    
    stop2 = SubElement(gradient, 'stop')
    stop2.set('offset', '100%')
    stop2.set('stop-color', '#0051D5')
    
    # Shadow filter
    shadow_filter = SubElement(defs, 'filter')
    shadow_filter.set('id', 'shadow')
    shadow_filter.set('x', '-50%')
    shadow_filter.set('y', '-50%')
    shadow_filter.set('width', '200%')
    shadow_filter.set('height', '200%')
    
    shadow_offset = SubElement(shadow_filter, 'feDropShadow')
    shadow_offset.set('dx', '0')
    shadow_offset.set('dy', '2')
    shadow_offset.set('stdDeviation', '4')
    shadow_offset.set('flood-opacity', '0.2')
    shadow_offset.set('flood-color', '#000')
    
    # Background with rounded corners (iOS style)
    bg_rect = SubElement(svg, 'rect')
    bg_rect.set('width', '128')
    bg_rect.set('height', '128')
    bg_rect.set('rx', '28.8')  # 22.5% of 128
    bg_rect.set('ry', '28.8')
    bg_rect.set('fill', 'url(#bgGradient)')
    
    # Chat window - clean white rounded rectangle
    window = SubElement(svg, 'rect')
    window.set('x', '20')
    window.set('y', '24')
    window.set('width', '88')
    window.set('height', '80')
    window.set('rx', '8')
    window.set('ry', '8')
    window.set('fill', '#FFFFFF')
    window.set('filter', 'url(#shadow)')
    
    # Window header bar
    header = SubElement(svg, 'rect')
    header.set('x', '20')
    header.set('y', '24')
    header.set('width', '88')
    header.set('height', '20')
    header.set('rx', '8')
    header.set('ry', '8')
    header.set('fill', '#F8F9FA')
    
    # Fix header bottom corners
    header_bottom = SubElement(svg, 'rect')
    header_bottom.set('x', '20')
    header_bottom.set('y', '36')
    header_bottom.set('width', '88')
    header_bottom.set('height', '8')
    header_bottom.set('fill', '#F8F9FA')
    
    # Window controls (3 dots)
    dot1 = SubElement(svg, 'circle')
    dot1.set('cx', '30')
    dot1.set('cy', '34')
    dot1.set('r', '2')
    dot1.set('fill', '#FF5F57')
    
    dot2 = SubElement(svg, 'circle')
    dot2.set('cx', '38')
    dot2.set('cy', '34')
    dot2.set('r', '2')
    dot2.set('fill', '#FFBD2E')
    
    dot3 = SubElement(svg, 'circle')
    dot3.set('cx', '46')
    dot3.set('cy', '34')
    dot3.set('r', '2')
    dot3.set('fill', '#28CA42')
    
    # Chat bubbles - simple and clean
    # User message (left, blue)
    user_bubble = SubElement(svg, 'rect')
    user_bubble.set('x', '28')
    user_bubble.set('y', '52')
    user_bubble.set('width', '36')
    user_bubble.set('height', '12')
    user_bubble.set('rx', '6')
    user_bubble.set('ry', '6')
    user_bubble.set('fill', '#007AFF')
    user_bubble.set('opacity', '0.8')
    
    # AI response (right, gray)
    ai_bubble = SubElement(svg, 'rect')
    ai_bubble.set('x', '72')
    ai_bubble.set('y', '68')
    ai_bubble.set('width', '28')
    ai_bubble.set('height', '12')
    ai_bubble.set('rx', '6')
    ai_bubble.set('ry', '6')
    ai_bubble.set('fill', '#E9ECEF')
    
    # Another user message
    user_bubble2 = SubElement(svg, 'rect')
    user_bubble2.set('x', '28')
    user_bubble2.set('y', '84')
    user_bubble2.set('width', '44')
    user_bubble2.set('height', '12')
    user_bubble2.set('rx', '6')
    user_bubble2.set('ry', '6')
    user_bubble2.set('fill', '#007AFF')
    user_bubble2.set('opacity', '0.8')
    
    return svg

def svg_to_string(svg_element):
    """Convert SVG element to string"""
    return tostring(svg_element, encoding='unicode')

def create_png_from_svg(svg_content, size, output_path):
    """Convert SVG to PNG at specified size"""
    if CAIRO_AVAILABLE:
        # High-quality conversion with cairosvg
        cairosvg.svg2png(
            bytestring=svg_content.encode('utf-8'),
            write_to=output_path,
            output_width=size,
            output_height=size,
            background_color='transparent'
        )
        return True
    else:
        print(f"❌ Cannot create {output_path} - cairosvg not available")
        return False

def main():
    """Generate all icon sizes"""
    print("🎨 Generating high-quality FloatingChat icons...")
    
    # Create icons directory
    os.makedirs('icons', exist_ok=True)
    
    # Create SVG
    svg_element = create_chat_window_svg()
    svg_content = svg_to_string(svg_element)
    
    # Save SVG for reference
    with open('icons/icon.svg', 'w') as f:
        f.write(svg_content)
    print("   ✅ Saved: icons/icon.svg")
    
    # Generate PNG icons at different sizes
    sizes = [16, 48, 128]
    
    for size in sizes:
        output_path = f'icons/icon{size}.png'
        print(f"   Creating {size}×{size} icon...")
        
        if create_png_from_svg(svg_content, size, output_path):
            print(f"   ✅ Saved: {output_path}")
        else:
            print(f"   ❌ Failed: {output_path}")
    
    print("\n🚀 High-quality icons generated successfully!")
    print("📁 Icons saved in: icons/")
    print("🔄 Reload your Chrome extension to see the new icons")

if __name__ == "__main__":
    main() 