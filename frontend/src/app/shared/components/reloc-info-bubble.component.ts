import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

@Component({
  selector: 'reloc-info-bubble',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center' },
  template: `<span class="relative ml-1 inline-flex items-center">
    <button
      type="button"
      (click)="open.set(!open())"
      class="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full
           bg-(--reloc-ref-color-primary-light) text-[10px] font-medium leading-none
           text-(--reloc-ref-color-primary) cursor-pointer hover:opacity-80"
    >
      <span class="-ml-px">?</span>
    </button>

    <div
      class="absolute left-6 bottom-0 z-10 w-52 rounded-md border p-2                 
           text-xs bg-(--reloc-ref-color-bg-card) border-(--reloc-ref-color-border)                                                              
           text-(--reloc-ref-color-text-secondary) shadow-md                                                                                     
           grid transition-[grid-template-rows,opacity] duration-200 ease-in-out"
      [class.grid-rows-[1fr]]="open()"
      [class.grid-rows-[0fr]]="!open()"
      [class.opacity-100]="open()"
      [class.opacity-0]="!open()"
      [class.pointer-events-none]="!open()"
    >
      <div class="overflow-hidden">
        <ng-content />
      </div>
    </div>
  </span> `,
})
export class InfoBubbleComponent {
  readonly open = signal(false);
}
