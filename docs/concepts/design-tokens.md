# Design Tokens

Design tokens are named values that encode visual design decisions — colors, fonts, spacing, radii — in a technology-agnostic format. A three-tier system separates primitive values (`--sys-*`), semantic references (`--ref-*`), and component-specific overrides (`--comp-*`). Semantic tokens reference primitives (`--ref-color-primary: var(--sys-color-teal-700)`), so swapping a theme means changing primitive values only. This mirrors the Material Design 3 token architecture and Europace's `--xp-*` system.

## Official Documentation

- [Material Design 3: Design Tokens](https://m3.material.io/foundations/design-tokens/overview)
- [W3C: Design Tokens Format Module](https://design-tokens.github.io/community-group/format/)
