# Interaction and runtime decisions

### Phase 5: Accessibility, Motion & Progressive Enhancement
1. **Semantic HTML**: Exactly one `<h1>`, sequential heading structure, valid landmark roles.

**Responsive navigation is required by default.** Every build with site navigation must provide an accessible mobile navigation treatment. Reuse a suitable existing component or, if the `astro-ui-patterns` skill is installed, its [mobile-nav recipe](../../astro-ui-patterns/components/mobile-nav-drawer.md). Preserve the approved design; choose the breakpoint from the available header space and verify immediately above and below it. Do not omit mobile navigation because the supplied design only shows desktop. If the mobile treatment requires an unresolved aesthetic choice, surface that choice before implementing it. Projects without site navigation do not need an artificial menu.

2. If the `astro-ui-patterns` skill is installed, check its [UI pattern index](../../astro-ui-patterns/SKILL.md) for the requested interaction, then read only its spec. Framework composition governs imports/tokens; the semantic and interaction contract still applies.
   - **Before adding a client framework or persistent browser script**, define the no-JavaScript path, then establish:
     1. Which user requirement cannot be met with HTML, CSS, or a small vanilla enhancement.
     2. Whether the core task still has a useful baseline when JavaScript fails.
     3. The accessibility, privacy, performance and maintenance cost of the added runtime.
     4. How the new behaviour will be verified against a production build.
3. When motion scope is unresolved, ask whether native CSS/vanilla enhancement, a choreographed engine or static baseline is wanted. Read [animation and motion](animations-and-motion.md) for the selected tier. Never hide LCP content; respect reduced motion and pause/stop/hide requirements. Component scripts run once per page: initialise every instance idempotently.
