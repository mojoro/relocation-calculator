import { Pipe, PipeTransform } from '@angular/core';

/**
 * Lightweight markdown-to-HTML pipe.
 * Supports: **bold**, list items (- or *), and newlines.
 * Sanitises HTML tags from input before transforming.
 */
@Pipe({ name: 'markdown', standalone: true })
export class MarkdownPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';

    // Strip any raw HTML tags to prevent XSS
    let safe = value.replace(/<[^>]*>/g, '');

    // Convert **bold** → <strong>bold</strong>
    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Split on newlines and inline list boundaries (". - " or ". * ")
    const lines = safe.split(/(?:\r?\n|(?<=\.)\s+[-*]\s)/);
    const hasListItems = lines.some(l => /^\s*[-*]\s/.test(l));

    if (hasListItems) {
      const parts: string[] = [];
      let inList = false;

      for (const line of lines) {
        const trimmed = line.trimStart();
        const match = trimmed.match(/^[-*]\s(.*)$/);
        if (match) {
          if (!inList) {
            parts.push('<ul class="mt-1.5 list-disc pl-4 space-y-0.5">');
            inList = true;
          }
          parts.push(`<li>${match[1]}</li>`);
        } else {
          if (inList) {
            parts.push('</ul>');
            inList = false;
          }
          if (trimmed) parts.push(`<span>${trimmed}</span>`);
        }
      }
      if (inList) parts.push('</ul>');
      safe = parts.join('');
    }

    return safe;
  }
}
