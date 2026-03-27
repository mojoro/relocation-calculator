import { Injectable, inject, signal, effect } from '@angular/core';
import { DOCUMENT } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeToggleService {
  private doc = inject(DOCUMENT);
  readonly isDark = signal(false);

  constructor() {
    effect(() => {
      const localTheme = localStorage.getItem('isDark');
      if (localTheme === 'true') this.isDark.set(true);
      else if (localTheme === 'false') this.isDark.set(false);
      else if (localTheme == null) localStorage.setItem('isDark', `${this.isDark()}`);

      this.doc.documentElement.setAttribute('data-theme', this.isDark() ? 'dark' : 'light');
    });
  }

  toggleTheme() {
    this.isDark.update((v) => !v);
    localStorage.setItem('isDark', `${this.isDark()}`);
  }
}
