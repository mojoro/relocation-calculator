> **Note:** This is reference material documenting the enterprise Angular patterns that inspired this project's architecture. These patterns were studied as examples of production-grade Angular development and adapted for the Berlin Relocation Calculator.

# Enterprise Angular Patterns (Europace Reference)

Production Angular codebases like Europace's use a specific set of patterns: standalone components with project-specific selector prefixes, reactive forms with many `Validators`, Angular Signals for UI state, `ChangeDetectionStrategy.OnPush` on all feature components, and a three-tier CSS custom property token system (`--xp-sys-*`, `--xp-ref-*`, `--xp-comp-*`) that bridges into Material Design 3. This project replicates these patterns using the `reloc-*` selector prefix and `--reloc-sys-*` / `--reloc-ref-*` token naming.

## Official Documentation

- [Europace GitHub](https://github.com/europace)
- [Angular Style Guide](https://angular.dev/style-guide)
