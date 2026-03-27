import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'reloc-info-bubble',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative inline-flex items-center' },
  template: `
    <button
      type="button"
      (click)="toggle.emit(); $event.stopPropagation()"
      class="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full
             border text-[10px] font-semibold leading-none cursor-pointer
             border-(--reloc-ref-color-primary)/30 text-(--reloc-ref-color-primary)
             hover:bg-(--reloc-ref-color-primary-light)"
    >?</button>
    <div
      (click)="$event.stopPropagation()"
      class="absolute left-full ml-2 bottom-0 z-20 w-52 rounded-md border p-2
             text-xs leading-relaxed shadow-md
             bg-(--reloc-ref-color-bg-card) border-(--reloc-ref-color-border)
             text-(--reloc-ref-color-text-secondary)
             grid transition-[grid-template-rows,opacity] duration-200 ease-in-out"
      [class.grid-rows-[1fr]]="isOpen()"
      [class.grid-rows-[0fr]]="!isOpen()"
      [class.opacity-100]="isOpen()"
      [class.opacity-0]="!isOpen()"
      [class.pointer-events-none]="!isOpen()"
    >
      <div class="overflow-hidden">
        <ng-content />
      </div>
    </div>
  `,
})
export class InfoBubbleComponent {
  readonly isOpen = input(false);
  readonly toggle = output();
}
