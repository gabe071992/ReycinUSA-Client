# Mechanical Watch Theme — Home Screen Overhaul


## Features
- Animated gear rings continuously and subtly rotate behind the Reycin branding in the hero — multiple rings at different speeds and directions, rendered with pure geometric shapes
- Subtle tick sound plays on every button press and navigation tap throughout the app
- "Explore F300" hero button and module removed entirely — the Shop page already covers it
- Vehicle cards in "Our Vehicles" navigate directly to that vehicle's Shop page
- Quick Actions restyled as **watch complications** — four circular dial cards arranged in a 2×2 compass formation, each with an engraved ring border, small dial tick marks, and gold-accented icon/label
- News/announcement cards restyled with a thin brushed-gold left border and engraved-plate aesthetic
- Section headers styled with fine uppercase letter-spacing and a gold rule line beneath, like chapter markers on a luxury watch bezel

## Design
- **Base color**: Deep black (`#0A0A0A`) — richer and deeper than the current flat black
- **Primary accent**: Brushed gold (`#C9A84C`) for borders, rule lines, icons, and highlighted text
- **Secondary accent**: Warm champagne (`#E8D5A0`) for subtitles and secondary labels
- **Card surfaces**: Very dark near-black (`#111111`) with a faint gold-tinted inner glow border (`rgba(201,168,76,0.2)`)
- **Typography**: Tight letter-spacing, uppercase labels in small caps style, weight contrast between ultra-light hero text and bold accent labels
- **Hero section**: Full-width dark panel with the Reycin wordmark centered; three concentric gear-ring SVG shapes rotate slowly behind it (one clockwise, one counter-clockwise, one slower) — all rendered in translucent gold strokes
- **Complication cards**: Circular, engraved-look cards with radial tick marks around the rim (12 marks like a watch), a gold-tinted icon in the center, label below — pressed state triggers a scale pulse and a tick sound
- **Announcement cards**: Dark plate with a 2px solid gold left accent bar, fine metadata row, clean white title
- **Loading state**: Gear ring animation spins while data loads — no generic spinner

## Screens Changed
- **Home screen** (`expo/app/(tabs)/home/index.tsx`) — completely restyled with the mechanical watch visual language described above
- **Theme constants** (`expo/constants/theme.ts`) — gold and watch-palette colors added for reuse across the app
- **Tick sound utility** — a small helper that plays a subtle tick audio clip on demand, used by button press handlers across the home screen
