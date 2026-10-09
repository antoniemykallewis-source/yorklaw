# York Law Firm website concept

A 3D website redesign concept for York Law Firm, designed and built by Vessel Archive (Sacramento, CA).

Live: https://antoniemykallewis-source.github.io/yorklaw/

Not York Law Firm's official website, and not affiliated with or endorsed by the firm. The contact form is not connected. Records shown in the 3D scene are illustrations.

Built with Three.js, GSAP ScrollTrigger and Lenis. Fonts: Poppins, Nunito Sans and IBM Plex Mono (SIL OFL). Icons: Phosphor (MIT).

## Brand refresh, October 2026

Uses York's official royal blue, orange, white, logo, group photograph, attorney portraits and recognition images. Brand assets are self-hosted; origins are documented in [BRAND-SOURCES.md](BRAND-SOURCES.md).

The original record spotlight, scroll-driven evidence wall, horizontal results, review carousel and stacked process remain. The refresh adds pointer-responsive photograph depth, accessible evidence step navigation and a pause control for the 3D scene. Touch layouts and reduced-motion alternatives are preserved.

Buildless static site. Source is maintained on `main`; GitHub Pages serves the repository root of `gh-pages`. Publish by advancing `gh-pages` to the reviewed site commit. `index.html` loads a single consolidated stylesheet, `css/site.css`, so the structural layout and York branding arrive together. Critical image sizing is also inline to prevent oversized logos or stretched photography during loading. No dependency install or build step is required.
