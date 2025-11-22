import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './star-rating.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StarRatingComponent {
  rating = input(0);
  isEditable = input(false);
  starCount = input(5);

  ratingChange = output<number>();

  hoveredRating = signal(0);

  stars = computed(() => Array.from({ length: this.starCount() }, (_, i) => i + 1));

  rate(rating: number): void {
    if (this.isEditable()) {
      this.ratingChange.emit(rating);
    }
  }

  onStarHover(rating: number): void {
    if (this.isEditable()) {
      this.hoveredRating.set(rating);
    }
  }

  onStarLeave(): void {
    if (this.isEditable()) {
      this.hoveredRating.set(0);
    }
  }
}
