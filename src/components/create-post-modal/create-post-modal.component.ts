
import { Component, ChangeDetectionStrategy, EventEmitter, Output, input, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ForumPost } from '../../shared/models/forum.model';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-create-post-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './create-post-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreatePostModalComponent implements OnInit {
  post = input<ForumPost | null>();
  categories = input<string[]>([]);
  @Output() save = new EventEmitter<{ title: string; content: string; category: string }>();
  @Output() close = new EventEmitter<void>();

  title = signal('');
  content = signal('');
  category = signal('');

  isEditing = signal(false);

  ngOnInit(): void {
    const postToEdit = this.post();
    if (postToEdit) {
      this.isEditing.set(true);
      this.title.set(postToEdit.title);
      this.content.set(postToEdit.content);
      this.category.set(postToEdit.category);
    } else if (this.categories().length > 0) {
      this.category.set(this.categories()[0]);
    }
  }

  onSave(): void {
    if (this.title().trim() && this.content().trim() && this.category()) {
      this.save.emit({
        title: this.title(),
        content: this.content(),
        category: this.category(),
      });
    }
  }

  onClose(): void {
    this.close.emit();
  }
}
