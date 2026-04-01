import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import {
  VisaType,
  ChecklistItem,
  VISA_TYPE_OPTIONS,
  getDefaultChecklist,
} from '../../core/models/checklist.model';
import { WizardService } from '../../core/services/wizard.service';

@Component({
  selector: 'reloc-visa-checklist',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './visa-checklist.component.html',
})
export class VisaChecklistComponent {
  private readonly wizardService = inject(WizardService);
  readonly visaTypeOptions = VISA_TYPE_OPTIONS;
  readonly selectedVisaType = this.wizardService.visaType;

  /** Checklist items with completed state derived from persisted IDs. */
  readonly checklist = computed<ChecklistItem[]>(() => {
    const completedIds = new Set(this.wizardService.completedChecklistIds());
    return getDefaultChecklist().map((item) => ({
      ...item,
      completed: completedIds.has(item.id),
    }));
  });

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
    this.wizardService.completedChecklistIds.update((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id],
    );
  }
}
