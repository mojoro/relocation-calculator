import { ChangeDetectionStrategy, Component, input, output, signal, ElementRef, inject } from '@angular/core';

@Component({
  selector: 'reloc-info-bubble',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center align-middle' },
  template: `
    <button
      type="button"
      (click)="onToggle($event)"
      class="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full
             border text-[10px] font-semibold leading-none cursor-pointer
             border-(--reloc-ref-color-primary)/30 text-(--reloc-ref-color-primary)
             hover:bg-(--reloc-ref-color-primary-light)"
    >?</button>
    @if (isOpen()) {
      <div
        (click)="$event.stopPropagation()"
        class="fixed z-50 w-56 rounded-md border p-2.5
               text-xs leading-relaxed shadow-md
               bg-(--reloc-ref-color-bg-card) border-(--reloc-ref-color-border)
               text-(--reloc-ref-color-text-secondary)"
        [style.top.px]="tooltipTop()"
        [style.left]="'50%'"
        [style.transform]="'translateX(-50%)'"
      >
        <ng-content />
      </div>
    }
  `,
})
export class InfoBubbleComponent {
  private readonly el = inject(ElementRef);
  readonly isOpen = input(false);
  readonly toggle = output();

  tooltipTop(): number {
    const rect = this.el.nativeElement.getBoundingClientRect();
    return rect.bottom + 6;
  }

  onToggle(event: MouseEvent): void {
    this.toggle.emit();
    event.stopPropagation();
  }
}
