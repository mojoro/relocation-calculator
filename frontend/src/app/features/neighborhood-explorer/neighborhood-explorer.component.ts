import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY } from 'rxjs';
import { CostEstimationService } from '../../core/services/cost-estimation.service';
import { NeighborhoodProfile, ApiError } from '../../core/models/cost.model';
import { NeighborhoodCardComponent } from './neighborhood-card.component';

@Component({
  selector: 'reloc-neighborhood-explorer',
  standalone: true,
  imports: [NeighborhoodCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <div>
        <h2
          class="text-2xl font-semibold text-(--reloc-ref-color-text-primary) [font-family:var(--reloc-ref-font-display)]"
        >
          Neighborhood Explorer
        </h2>
        <p class="mt-1 text-sm text-(--reloc-ref-color-text-secondary)">
          Explore Berlin's 12 districts to find the right neighborhood for your lifestyle and
          budget.
        </p>
      </div>

      @if (isLoading()) {
        <div
          class="flex items-center justify-center rounded-lg border p-12 border-(--reloc-ref-color-border) bg-(--reloc-ref-color-bg-card)"
        >
          <div
            class="h-5 w-5 animate-spin rounded-full border-2 border-(--reloc-ref-color-primary) border-t-transparent"
          ></div>
          <span class="ml-3 text-sm text-(--reloc-ref-color-text-secondary)"
            >Loading neighborhoods...</span
          >
        </div>
      }

      @if (error(); as err) {
        <div
          class="rounded-lg border p-4 border-(--reloc-ref-color-error) bg-[#fef2f2]"
        >
          <p class="text-sm font-medium text-(--reloc-ref-color-error)">
            {{ err.message }}
          </p>
          <p class="mt-2 text-xs text-(--reloc-ref-color-text-muted)">
            Showing static neighborhood data instead.
          </p>
        </div>
      }

      @if (!isLoading()) {
        <div class="grid gap-4 sm:grid-cols-2">
          @for (profile of neighborhoods(); track profile.bezirk) {
            <reloc-neighborhood-card [profile]="profile" />
          }
        </div>
      }
    </div>
  `,
})
export class NeighborhoodExplorerComponent implements OnInit {
  private readonly costService = inject(CostEstimationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly neighborhoods = signal<NeighborhoodProfile[]>(this.getStaticProfiles());
  readonly isLoading = signal(true);
  readonly error = signal<ApiError | null>(null);

  ngOnInit(): void {
    this.costService
      .getAllNeighborhoods()
      .pipe(
        catchError((err) => {
          this.error.set(err);
          this.isLoading.set(false);
          // Fall back to static data (already set as default)
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((profiles) => {
        this.neighborhoods.set(profiles);
        this.isLoading.set(false);
      });
  }

  /** Static fallback data in case the backend isn't running */
  private getStaticProfiles(): NeighborhoodProfile[] {
    return [
      {
        bezirk: 'mitte',
        displayName: 'Mitte',
        vibe: 'The historic and governmental heart of Berlin. Tourist-heavy but culturally rich.',
        commuteMinutesMin: 5, commuteMinutesMax: 25,
        highlights: [
          'Museum Island & Brandenburg Gate',
          'Excellent transit connections',
          'International dining scene',
          'Expensive but central',
        ],
      },
      {
        bezirk: 'friedrichshain-kreuzberg',
        displayName: 'Friedrichshain-Kreuzberg',
        vibe: "Berlin's creative and nightlife epicenter. Diverse, vibrant, sometimes chaotic.",
        commuteMinutesMin: 6, commuteMinutesMax: 20,
        highlights: [
          'Best nightlife in Berlin',
          'Multicultural food scene',
          'Strong startup community',
          'Highly competitive rental market',
        ],
      },
      {
        bezirk: 'pankow',
        displayName: 'Pankow',
        vibe: 'Family-friendly with a village feel. Prenzlauer Berg is the gentrified gem within.',
        commuteMinutesMin: 11, commuteMinutesMax: 35,
        highlights: [
          'Café culture and boutiques',
          'Mauerpark flea market',
          'Excellent schools',
          'More affordable than Mitte',
        ],
      },
      {
        bezirk: 'charlottenburg-wilmersdorf',
        displayName: 'Charlottenburg-Wilmersdorf',
        vibe: 'Old West Berlin elegance. Upscale, quiet, with grand architecture.',
        commuteMinutesMin: 12, commuteMinutesMax: 30,
        highlights: [
          'Kurfürstendamm shopping',
          'Charlottenburg Palace',
          'Strong expat community',
          'Quieter residential atmosphere',
        ],
      },
      {
        bezirk: 'neukoelln',
        displayName: 'Neukölln',
        vibe: 'Rapidly gentrifying but still gritty. Art galleries meet döner shops.',
        commuteMinutesMin: 11, commuteMinutesMax: 30,
        highlights: [
          'Thriving art and music scene',
          'Incredible food diversity',
          'Tempelhofer Feld access',
          'More affordable than Kreuzberg',
        ],
      },
      {
        bezirk: 'tempelhof-schoeneberg',
        displayName: 'Tempelhof-Schöneberg',
        vibe: 'Diverse and welcoming. Historic LGBTQ+ neighborhood with great parks.',
        commuteMinutesMin: 15, commuteMinutesMax: 30,
        highlights: [
          'Tempelhofer Feld',
          'Vibrant LGBTQ+ scene',
          'Good mix of cultures',
          'Excellent U-Bahn connections',
        ],
      },
      {
        bezirk: 'steglitz-zehlendorf',
        displayName: 'Steglitz-Zehlendorf',
        vibe: 'Leafy, suburban, and academic. Home to Freie Universität.',
        commuteMinutesMin: 25, commuteMinutesMax: 45,
        highlights: [
          'Botanical Garden',
          'Lakes for swimming',
          'University atmosphere',
          'Safe and family-friendly',
        ],
      },
      {
        bezirk: 'treptow-koepenick',
        displayName: 'Treptow-Köpenick',
        vibe: "Berlin's green lung. Lakes, forests, and a small-town feel.",
        commuteMinutesMin: 15, commuteMinutesMax: 45,
        highlights: [
          'Müggelsee lake',
          'Treptower Park',
          'Outdoor activities',
          'Affordable with nature access',
        ],
      },
      {
        bezirk: 'lichtenberg',
        displayName: 'Lichtenberg',
        vibe: 'Up-and-coming East Berlin. Vietnamese community hub with great food.',
        commuteMinutesMin: 12, commuteMinutesMax: 25,
        highlights: ['Dong Xuan Center', 'Tierpark Berlin', 'Affordable', 'Growing creative scene'],
      },
      {
        bezirk: 'spandau',
        displayName: 'Spandau',
        vibe: 'A city within a city. Affordable, green, and feels separate from Berlin.',
        commuteMinutesMin: 25, commuteMinutesMax: 55,
        highlights: [
          'Most affordable rents',
          'Spandau Citadel',
          'Rivers and forests',
          'Longer commute',
        ],
      },
      {
        bezirk: 'marzahn-hellersdorf',
        displayName: 'Marzahn-Hellersdorf',
        vibe: 'East Berlin Plattenbau district being reinvented. Surprisingly green.',
        commuteMinutesMin: 25, commuteMinutesMax: 45,
        highlights: [
          'Gardens of the World',
          'Lowest rents in Berlin',
          'Large apartments',
          'Improving transit',
        ],
      },
      {
        bezirk: 'reinickendorf',
        displayName: 'Reinickendorf',
        vibe: 'Quiet northern district. Lakes, forests, and old Berlin charm.',
        commuteMinutesMin: 20, commuteMinutesMax: 45,
        highlights: [
          'Tegeler See',
          'Tegel redevelopment',
          'French Quarter',
          'Affordable with good amenities',
        ],
      },
    ];
  }
}
