import { ChangeDetectionStrategy, Component, input, output, signal, ElementRef, inject } from '@angular/core';

@Component({
  selector: 'reloc-info-bubble',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative inline-flex items-center' },
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
        class="absolute z-50 w-56 rounded-md border p-2.5
               text-xs leading-relaxed shadow-md
               bg-(--reloc-ref-color-bg-card) border-(--reloc-ref-color-border)
               text-(--reloc-ref-color-text-secondary)"
        [class]="positionClass()"
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

  positionClass(): string {
    const rect = this.el.nativeElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    // If the bubble would clip the right edge, position to the left instead
    if (rect.right + 230 > viewportWidth) {
      return 'right-0 top-6';
    }
    return 'left-0 top-6';
  }

  onToggle(event: MouseEvent): void {
    this.toggle.emit();
    event.stopPropagation();
  }
}
