import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'reloc-info-bubble',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center' },
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
        class="fixed z-50 w-52 -translate-y-full rounded-md border p-2
               text-xs leading-relaxed shadow-md
               bg-(--reloc-ref-color-bg-card) border-(--reloc-ref-color-border)
               text-(--reloc-ref-color-text-secondary)"
        [style.top.px]="pos().top"
        [style.left.px]="pos().left"
      >
        <ng-content />
      </div>
    }
  `,
})
export class InfoBubbleComponent {
  readonly isOpen = input(false);
  readonly toggle = output();
  readonly pos = signal({ top: 0, left: 0 });

  onToggle(event: MouseEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.pos.set({ top: rect.bottom, left: rect.right + 8 });
    this.toggle.emit();
    event.stopPropagation();
  }
}
