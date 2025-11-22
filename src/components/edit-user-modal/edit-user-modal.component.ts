import { Component, ChangeDetectionStrategy, EventEmitter, Output, input, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../shared/models/user.model';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-edit-user-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './edit-user-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditUserModalComponent implements OnInit {
  user = input.required<User>();
  @Output() save = new EventEmitter<{ username: string; email: string; password?: string; profilePictureUrl?: string; }>();
  @Output() close = new EventEmitter<void>();

  // Form state signals
  username = signal('');
  email = signal('');
  newPassword = signal('');
  profilePictureUrl = signal<string | undefined>(undefined);
  newProfilePictureData = signal<string | null>(null);

  ngOnInit(): void {
    this.username.set(this.user().username);
    this.email.set(this.user().email);
    this.profilePictureUrl.set(this.user().profilePictureUrl);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert('File is too large. Please select an image under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        this.newProfilePictureData.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  onSave(): void {
    const updateData: { username: string; email: string; password?: string; profilePictureUrl?: string; } = {
      username: this.username(),
      email: this.email(),
    };
    if (this.newPassword().trim()) {
      updateData.password = this.newPassword();
    }
    if (this.newProfilePictureData()) {
      updateData.profilePictureUrl = this.newProfilePictureData()!;
    }
    this.save.emit(updateData);
  }

  onClose(): void {
    this.close.emit();
  }
}