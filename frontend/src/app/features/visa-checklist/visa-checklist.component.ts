import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import {
  VisaType,
  ChecklistItem,
  VISA_TYPE_OPTIONS,
  getDefaultChecklist,
} from '../../core/models/checklist.model';

@Component({
  selector: 'reloc-visa-checklist',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './visa-checklist.component.html',
})
export class VisaChecklistComponent {
  readonly visaTypeOptions = VISA_TYPE_OPTIONS;
  readonly selectedVisaType = signal<VisaType>('eu-blue-card');
  readonly checklist = signal<ChecklistItem[]>(getDefaultChecklist());

  readonly filteredItems = computed(() => {
    const visaType = this.selectedVisaType();
    return this.checklist().filter((item) => item.visaTypes.includes(visaType));
  });

  readonly groupedItems = computed(() => {
    const items = this.filteredItems();
    const groups: { category: string; items: ChecklistItem[] }[] = [];
    const seen = new Set<string>();
    for (const item of items) {
      if (!seen.has(item.category)) {
        seen.add(item.category);
        groups.push({
          category: item.category,
          items: items.filter((i) => i.category === item.category),
        });
      }
    }
    return groups;
  });

  readonly completedCount = computed(() => this.filteredItems().filter((i) => i.completed).length);
  readonly totalCount = computed(() => this.filteredItems().length);
  readonly progressPercent = computed(() => {
    const total = this.totalCount();
    return total === 0 ? 0 : Math.round((this.completedCount() / total) * 100);
  });

  selectVisaType(type: VisaType): void {
    this.selectedVisaType.set(type);
  }

  toggleItem(id: string): void {
    this.checklist.update((items) =>
      items.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)),
    );
  }
}
