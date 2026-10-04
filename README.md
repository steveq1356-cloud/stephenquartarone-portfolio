# Stephen Quartarone Engineering Portfolio

Open `index.html` to preview the website.

Included project pages:
- Dual-Cavity Polyurethane Mold
- Swing Bolt Demold System
- Autonomous Mobile Robot
- Polyurethane Test Molds
- Temporary Wire Saw Containment Enclosure
- Parallette Gym Equipment

Working On (homepage section):
- InsertPress, with a live animation of the machine (`insertpress.js`)

Contact links and the supplied resume PDF are included.
All files are stored at the repository root for simple GitHub Pages uploads.

## Structure
- `styles.css` — the shared blueprint theme used by every page (colors are defined once at the top under `:root`).
- `site.js` — shared interactions: mobile menu, scroll progress bar, image zoom, copy-email button, scroll reveals.
- `favicon.svg` — browser tab icon.
- Each case-study page uses the same building blocks: a title block (`.tb`), key results (`.impact`), numbered story sections (`.story`), and auto-numbered figures (`.fig`). Wrap any image in a `.fig` and it gets a FIG. number and click-to-enlarge automatically.
