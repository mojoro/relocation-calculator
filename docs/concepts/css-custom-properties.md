# CSS Custom Properties

CSS custom properties (also called CSS variables) are entities defined with a `--` prefix that hold values reusable throughout a stylesheet. They enable dynamic theming, are scope-able to any element, and cascade like regular CSS. Changing a custom property value automatically updates every element that references it, making runtime theme switching possible without JavaScript. Design token systems like `--reloc-sys-*` and `--reloc-ref-*` are built on top of custom properties.

## Official Documentation

- [MDN: CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [MDN: var()](https://developer.mozilla.org/en-US/docs/Web/CSS/var)
