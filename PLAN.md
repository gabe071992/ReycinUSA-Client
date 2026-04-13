# Homepage Cleanup, League Streaming Library Rename & Android Nav Bar Hiding


## Features

### Homepage Updates
- **Remove** the "OBD Diagnostics" and "Warranty" quick action buttons entirely
- **Replace** the Diagnostics slot with a "Watch" button (📺) that deep-links directly into the League tab, pre-opening the streaming library
- **Vehicle cards** in "Our Vehicles" are now tappable — pressing any vehicle navigates to its dedicated Shop product page

### League Interface
- The "WATCH VIDEOS" button label inside the League module is renamed to **"LEAGUES LIBRARY"** to reflect the broader streaming network intent

### Android Navigation Bar
- The Android system bottom bar (back / home / recents buttons) is set to **automatically hide** while the app is open and in use
- Swiping up from the very bottom of the screen will temporarily reveal it, matching the standard immersive mode behaviour used by apps like YouTube and Instagram

## Design
- No visual style changes — all existing colours, typography, and layouts are preserved
- The Quick Actions grid will still be 2×2, just with the four correct entries: Watch, Track Support, Parts, and a fourth slot as-is
- Watch button uses a 📺 icon consistent with the existing grid style

## Screens Affected
- **Home tab** — Quick Actions grid and Our Vehicles cards
- **Race tab → League subtab** — "LEAGUES LIBRARY" button label
- **Root layout** — Android navigation bar hiding applied globally on mount
