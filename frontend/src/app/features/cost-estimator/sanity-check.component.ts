import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  output,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { MarkdownPipe } from '../../shared/pipes/markdown.pipe';
import type { BudgetCategory, BudgetAnalysis } from '../../core/models/budget.model';

@Component({
  selector: 'reloc-sanity-check',
  standalone: true,
  imports: [DatePipe, MarkdownPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sanity-check.component.html',
})
export class SanityCheckComponent {
  // --------------- Inputs ---------------
  readonly categories = input.required<BudgetCategory[]>();
  readonly netMonthlySalary = input.required<number>();
  readonly rentMedian = input.required<number>();
  readonly bezirkDisplayName = input.required<string>();

  /** Completed AI analysis (null until fetched). */
  readonly analysis = input<BudgetAnalysis | null>(null);
  /** Whether an AI analysis request is in flight. */
  readonly isAnalyzing = input<boolean>(false);
  /** Error message from a failed analysis request. */
  readonly analysisError = input<string | null>(null);

  /** Whether the budget has changed since the last analysis. */
  readonly budgetChanged = input<boolean>(false);

  // --------------- Outputs ---------------
  /** Emitted when the user clicks "Analyze My Budget". */
  readonly analyzeRequested = output<void>();

  // --------------- Computed: rules-based sanity checks ---------------
  readonly rules = computed(() => {
    const cats = this.categories();
    const net = this.netMonthlySalary();
    const rules: Array<{
      key: string;
      label: string;
      verdict: 'pass' | 'warning' | 'fail';
      message: string;
    }> = [];

    // 1. Rent-to-income ratio (30% rule — Mietbelastungsquote)
    const rentCat = cats.find((c) => c.key === 'rent');
    if (rentCat) {
      const rentRatio = rentCat.total / net;
      if (rentRatio <= 0.3) {
        rules.push({
          key: 'rent-ratio',
          label: 'Rent Ratio',
          verdict: 'pass',
          message: `Rent is ${(rentRatio * 100).toFixed(0)}% of income — within the recommended 30%.`,
        });
      } else if (rentRatio <= 0.4) {
        rules.push({
          key: 'rent-ratio',
          label: 'Rent Ratio',
          verdict: 'warning',
          message: `Rent is ${(rentRatio * 100).toFixed(0)}% of income — above the 30% guideline but manageable.`,
        });
      } else {
        rules.push({
          key: 'rent-ratio',
          label: 'Rent Ratio',
          verdict: 'fail',
          message: `Rent is ${(rentRatio * 100).toFixed(0)}% of income — significantly above the 30% guideline.`,
        });
      }
    }

    // 2. Savings rate
    const savingsCat = cats.find((c) => c.key === 'savings');
    if (savingsCat) {
      if (savingsCat.percentage >= 20) {
        rules.push({
          key: 'savings',
          label: 'Savings Rate',
          verdict: 'pass',
          message: `${savingsCat.percentage}% savings — excellent for building financial security.`,
        });
      } else if (savingsCat.percentage >= 10) {
        rules.push({
          key: 'savings',
          label: 'Savings Rate',
          verdict: 'warning',
          message: `${savingsCat.percentage}% savings — consider targeting 20% if possible.`,
        });
      } else {
        rules.push({
          key: 'savings',
          label: 'Savings Rate',
          verdict: 'fail',
          message: `${savingsCat.percentage}% savings — below the recommended 10% minimum.`,
        });
      }
    }

    // 3. Emergency fund feasibility (3 months of expenses within 1 year)
    const totalSpent = cats
      .filter((c) => c.key !== 'savings')
      .reduce((s, c) => s + c.total, 0);
    const threeMonthBuffer = totalSpent * 3;
    const monthlySavings = savingsCat?.total ?? 0;
    if (monthlySavings > 0) {
      const monthsToBuffer = threeMonthBuffer / monthlySavings;
      if (monthsToBuffer <= 12) {
        rules.push({
          key: 'emergency',
          label: 'Emergency Fund',
          verdict: 'pass',
          message: `3-month emergency fund achievable in ${Math.ceil(monthsToBuffer)} months.`,
        });
      } else if (monthsToBuffer <= 24) {
        rules.push({
          key: 'emergency',
          label: 'Emergency Fund',
          verdict: 'warning',
          message: `3-month emergency fund would take ~${Math.ceil(monthsToBuffer)} months to build.`,
        });
      } else {
        rules.push({
          key: 'emergency',
          label: 'Emergency Fund',
          verdict: 'fail',
          message: `At current savings rate, a 3-month buffer would take ${Math.ceil(monthsToBuffer)}+ months.`,
        });
      }
    }

    // 4. Total allocation check
    const totalPercent = cats.reduce((s, c) => s + c.percentage, 0);
    if (totalPercent > 100) {
      rules.push({
        key: 'overbudget',
        label: 'Budget Balance',
        verdict: 'fail',
        message: `Total allocation is ${totalPercent.toFixed(0)}% — you're ${(totalPercent - 100).toFixed(0)}% over budget.`,
      });
    } else if (totalPercent < 85) {
      rules.push({
        key: 'underbudget',
        label: 'Budget Balance',
        verdict: 'warning',
        message: `Only ${totalPercent.toFixed(0)}% allocated — ${(100 - totalPercent).toFixed(0)}% of income unaccounted for.`,
      });
    } else {
      rules.push({
        key: 'balanced',
        label: 'Budget Balance',
        verdict: 'pass',
        message: `${totalPercent.toFixed(0)}% allocated — well-balanced budget.`,
      });
    }

    // 5. Grocery budget reasonableness
    const groceryCat = cats.find((c) => c.key === 'groceries');
    if (groceryCat && groceryCat.total < 150) {
      rules.push({
        key: 'groceries',
        label: 'Grocery Budget',
        verdict: 'warning',
        message: `\u20AC${groceryCat.total.toFixed(0)}/month for groceries is tight for Berlin — budget \u20AC200+ for comfortable shopping.`,
      });
    }

    return rules;
  });

  // --------------- Computed: summary counts ---------------
  readonly passCount = computed(
    () => this.rules().filter((r) => r.verdict === 'pass').length,
  );
  readonly warnCount = computed(
    () => this.rules().filter((r) => r.verdict === 'warning').length,
  );
  readonly failCount = computed(
    () => this.rules().filter((r) => r.verdict === 'fail').length,
  );

  // --------------- Helpers ---------------
  getSectionIcon(key: string): string {
    const icons: Record<string, string> = {
      'daily-life': '\u2600\uFE0F',
      housing: '\uD83C\uDFE0',
      'food-and-dining': '\uD83C\uDF7D\uFE0F',
      'transport-and-mobility': '\uD83D\uDE87',
      'leisure-and-culture': '\uD83C\uDFAD',
      'financial-health': '\uD83D\uDCB0',
      tips: '\uD83D\uDCA1',
    };
    return icons[key] ?? '\uD83D\uDCCC';
  }

  verdictBgClass(verdict: string): string {
    const classes: Record<string, string> = {
      pass: 'bg-(--reloc-ref-color-success-light)',
      warning: 'bg-(--reloc-ref-color-warning-light)',
      fail: 'bg-(--reloc-ref-color-error-light)',
    };
    return classes[verdict] ?? '';
  }

  verdictColor(verdict: string): string {
    const colors: Record<string, string> = {
      pass: 'var(--reloc-ref-color-success)',
      warning: 'var(--reloc-ref-color-warning)',
      fail: 'var(--reloc-ref-color-error)',
    };
    return colors[verdict] ?? '';
  }

  sentimentColor(sentiment: string | undefined): string {
    const colors: Record<string, string> = {
      positive: 'var(--reloc-ref-color-success)',
      caution: 'var(--reloc-ref-color-warning)',
      neutral: 'var(--reloc-ref-color-primary)',
    };
    return (sentiment && colors[sentiment]) ?? 'var(--reloc-ref-color-primary)';
  }

  onAnalyzeClick(): void {
    this.analyzeRequested.emit();
  }
}
