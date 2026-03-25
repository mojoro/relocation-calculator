# Europace Patterns

Europace's Rechner frontend uses a specific set of Angular patterns: standalone components with `baufi-passt-*` selector prefixes, reactive forms with many `Validators`, Angular Signals for UI state, `ChangeDetectionStrategy.OnPush` on all feature components, and a three-tier CSS custom property token system (`--xp-sys-*`, `--xp-ref-*`, `--xp-comp-*`) that bridges into Material Design 3. This project intentionally replicates these patterns using the `reloc-*` selector prefix and `--reloc-sys-*` / `--reloc-ref-*` token naming.

## Official Documentation

- [Europace GitHub](https://github.com/europace)
- [Angular Style Guide](https://angular.dev/style-guide)
