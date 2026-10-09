# York Law Firm website concept

A 3D website redesign concept for York Law Firm, designed and built by Vessel Archive (Sacramento, CA).

Live: https://antoniemykallewis-source.github.io/yorklaw/

Not York Law Firm's official website, and not affiliated with or endorsed by the firm. The contact form is not connected. Records shown in the 3D scene are illustrations.

Built with Three.js, GSAP ScrollTrigger and Lenis. Fonts: Poppins, Nunito Sans and IBM Plex Mono (SIL OFL). Icons: Phosphor (MIT).

## Brand refresh, October 2026

Uses York's official royal blue, orange, white, logo, group photograph, attorney portraits and recognition images. Brand assets are self-hosted; origins are documented in [BRAND-SOURCES.md](BRAND-SOURCES.md).

The original record spotlight, scroll-driven evidence wall, horizontal results, review carousel and stacked process remain. The refresh adds pointer-responsive photograph depth, accessible evidence step navigation and a pause control for the 3D scene. Touch layouts and reduced-motion alternatives are preserved.

Buildless static site. GitHub Pages serves the repository root. `index.html` loads the original structural styles from `css/site.css` and the York visual layer from `css/brand.css`. No dependency install or build step is required.
