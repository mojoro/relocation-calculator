import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="min-h-screen" style="background-color: var(--reloc-ref-color-bg-body)">
      <header class="border-b px-6 py-4" style="background-color: var(--reloc-ref-color-bg-card); border-color: var(--reloc-ref-color-border)">
        <h1 class="text-xl font-semibold" style="color: var(--reloc-ref-color-primary); font-family: var(--reloc-ref-font-display)">
          Berlin Relocation Planner
        </h1>
      </header>
      <main class="mx-auto max-w-4xl px-4 py-8">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppComponent {}
