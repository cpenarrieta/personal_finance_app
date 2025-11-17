# App Icons - To Be Added

The app is configured for PWA support with custom icons. Please add the following icon files to this directory:

## Required Icon Files

1. **apple-touch-icon.png** (180×180px)
   - Used when adding the app to iPhone home screen
   - This fixes the issue where only a "D" letter was shown

2. **icon-192.png** (192×192px)
   - For Android/PWA

3. **icon-512.png** (512×512px)
   - For high-resolution displays

4. **favicon.ico** (32×32px)
   - For browser tabs

## Configuration

The icons are referenced in:
- `src/app/layout.tsx` - Metadata configuration
- `public/manifest.json` - PWA manifest

## Icon Design

The icon should match the app's branding (suggest using the Wallet icon from the sidebar).
