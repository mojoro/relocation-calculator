import { Component, ChangeDetectionStrategy, input, signal, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Shared currency input component with EUR formatting.
 * Implements ControlValueAccessor for use with reactive forms.
 */
@Component({
  selector: 'reloc-currency-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CurrencyInputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="relative">
      <span
        class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[--reloc-ref-color-text-muted]"
        >&#8364;</span
      >
      <input
        type="text"
        [id]="inputId()"
        [placeholder]="placeholder()"
        [value]="displayValue()"
        (input)="onInput($event)"
        (blur)="onBlur()"
        class="w-full rounded-md border py-2.5 pl-8 pr-3 text-sm outline-none transition-colors focus:ring-2 border-[--reloc-ref-color-border] bg-[--reloc-ref-color-bg-card]"
      />
    </div>
  `,
})
export class CurrencyInputComponent implements ControlValueAccessor {
  readonly inputId = input.required<string>();
  readonly placeholder = input<string>('0');

  readonly displayValue = signal('');

  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: number | null): void {
    this.displayValue.set(value !== null ? this.formatNumber(value) : '');
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  onInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const cleaned = raw.replace(/[^0-9]/g, '');
    const num = cleaned ? parseInt(cleaned, 10) : null;
    this.displayValue.set(num !== null ? this.formatNumber(num) : '');
    this.onChange(num);
  }

  onBlur(): void {
    this.onTouched();
  }

  private formatNumber(value: number): string {
    return value.toLocaleString('de-DE');
  }
}
