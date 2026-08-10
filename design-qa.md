# Conversation TOC design QA

- Source visual truth:
  - `/Users/linzhangsheng/.t3/userdata/attachments/51ea8ff9-8572-4540-928c-8813914829b6-a0f75dfa-8fce-4bfe-a78d-eaa35da95050.png`
  - `/Users/linzhangsheng/.t3/userdata/attachments/51ea8ff9-8572-4540-928c-8813914829b6-03f66af5-a6a0-4c14-925d-91233a496d8f.png`
- Source pixels: 1966 × 1692 (collapsed) and 1910 × 1308 (expanded).
- Official implementation reference:
  - `https://fe-static.deepseek.com/chat/static/main.0dd14bec80.css`
  - DeepSeek scroll navigation uses a 34 × 300 px rail, a 240 px maximum card width, 15 px vertical page padding, 30 px rows, 16 px radius, and 8 × 2 px indicators with a 1.5× active scale.
  - DeepSeek's shared popover transition uses `opacity: 0`, `scale(.96)`, a right-side transform origin, and a 100 ms transition.
- Implementation screenshot: unavailable because the collaborative preview screenshot operation failed repeatedly.
- Browser viewport inspected: 1280 × 800 CSS px at device pixel ratio 2.
- States inspected: collapsed, expanded through `:focus-within` (the same visual treatment as hover), active item, and click-to-scroll.

**Full-view comparison evidence**

- Both source images were opened at original detail.
- The browser-rendered component was inspected through live layout and computed-style measurements. The collapsed rail measured 34 × 300 CSS px and sat 16 px from the right edge. With two entries, the expanded panel measured 240 × 90 CSS px with a 16 px radius. Its rows measured 30 px high; inactive and active bars measured 8 × 2 px and 12 × 3 px respectively.
- A browser screenshot could not be captured, so a combined source/implementation visual comparison was not possible.

**Focused region comparison evidence**

- Typography: labels render at 13 px with a 20 px line height, right aligned, single-line, and truncated.
- Spacing/layout: the expanded panel is anchored to the rail's right edge and uses 15 px vertical and 24 px leading padding, matching the official implementation.
- Colors/tokens: panel, border, muted text, and active state use the existing Nuxt UI semantic tokens.
- Image quality: not applicable; the component has no raster assets.
- Copy/content: titles are derived from complete user-message text and preserve the source wording.

**Interaction evidence**

- Clicking the second entry moved the scroll container to 1136 px, matching the computed target of 1136 px, and updated `aria-current` to that entry.
- Keyboard focus expands the same panel as hover. The panel transition measured 100 ms, scales from 0.96 to 1 from the right-center origin, and animates only transform and opacity. Reduced-motion users receive instant scrolling and no TOC transition.
- Console diagnostics could not be retrieved because the same preview capture operation failed.

**Findings**

- [P2] Browser screenshot evidence is missing.
  Location: final visual comparison.
  Evidence: layout, styles, and interaction were measurable, but the collaborative preview returned `Preview snapshot failed` on every capture attempt.
  Impact: exact rendered typography and compositing cannot be certified from a side-by-side image.
  Fix: capture the signed-in chat route when the collaborative preview screenshot service is available, then compare its collapsed and hover states against both source images.

**Open Questions**

- None about the requested behavior or dimensions; only screenshot capture remains unavailable.

**Implementation Checklist**

- Capture the collapsed state at a matching desktop viewport.
- Capture the hover-expanded state at the same viewport.
- Compare both captures with the source images and close the remaining P2 if no visual mismatch appears.

**Follow-up Polish**

- None identified from the measured layout and interaction states.

final result: blocked
