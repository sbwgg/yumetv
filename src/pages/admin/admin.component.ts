import { Component, ChangeDetectionStrategy, inject, signal, ViewChild, ElementRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { MovieService } from '../../services/movie.service';
import { SettingsService } from '../../services/settings.service';
import { User } from '../../shared/models/user.model';
import { Media } from '../../shared/models/movie.model';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { EditUserModalComponent } from '../../components/edit-user-modal/edit-user-modal.component';

const NO_POSTER_URL = 'https://via.placeholder.com/400x600/1E293B/FFFFFF?text=No+Poster';
const NO_THUMBNAIL_URL = 'https://via.placeholder.com/400x225/1E293B/FFFFFF?text=No+Thumbnail';
const NO_EPISODE_THUMBNAIL_URL = 'https://via.placeholder.com/300x150/1E293B/FFFFFF?text=No+Image';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, EditUserModalComponent],
  templateUrl: './admin.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent {
  authService = inject(AuthService);
  movieService = inject(MovieService);
  settingsService = inject(SettingsService);
  translationService = inject(TranslationService);
  
  @ViewChild('editFormSection') editFormSection!: ElementRef;

  activeTab = signal<'dashboard' | 'users' | 'content' | 'settings'>('dashboard');
  
  // User Management
  users = this.authService.getUsers();
  showEditUserModal = signal(false);
  selectedUserForEdit = signal<User | null>(null);
  
  // Content Management
  availableLanguages = this.movieService.getAvailableLanguages();
  editingMediaId = signal<number | null>(null);
  showAudioLangDropdown = signal(false);
  showSubtitleLangDropdown = signal(false);
  newMedia = {
    title: '',
    description: '',
    posterUrl: NO_POSTER_URL,
    thumbnailUrl: NO_THUMBNAIL_URL,
    releaseYear: new Date().getFullYear(),
    genre: '',
    tags: '',
    type: 'Movie' as 'Movie' | 'TV Show',
    audioLanguages: [] as string[],
    subtitleLanguages: [] as string[],
    isProtected: false,
    licenseServerUrl: '',
    ageRating: 'G',
    sourceUrl: '',
    seasons: [] as { seasonNumber: number; episodes: { episodeNumber: number; title: string; sourceUrl: string; thumbnailUrl: string }[] }[],
  };

  // Settings
  maintenanceEnabled = signal(this.settingsService.settings().maintenanceMode.enabled);
  maintenanceMessage = signal(this.settingsService.settings().maintenanceMode.message);
  siteName = signal(this.settingsService.settings().siteName);

  mainSiteUrl = computed(() => {
    const currentHost = window.location.host;
    const protocol = window.location.protocol;
    // Handles panel.yume.tv -> yume.tv and panel.localhost -> localhost
    const mainHost = currentHost.startsWith('panel.') ? currentHost.substring(6) : 'localhost:8080';
    return `${protocol}//${mainHost}`;
  });

  updateUserRole(user: User, event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    const role = selectElement.value as 'user' | 'mod' | 'admin';
    this.authService.updateUserRole(user.id, role);
  }

  openEditUserModal(user: User) {
    this.selectedUserForEdit.set(user);
    this.showEditUserModal.set(true);
  }

  handleSaveUser(updateData: { username: string; email: string; password?: string; profilePictureUrl?: string; }) {
    const user = this.selectedUserForEdit();
    if (user) {
      const result = this.authService.adminUpdateUser(user.id, updateData);
      if (result.success) {
        alert(this.translationService.translate('profileUpdateSuccess'));
        this.showEditUserModal.set(false);
      } else {
        alert(this.translationService.translate(result.message));
      }
    }
  }

  onFileSelected(event: Event, type: 'poster' | 'thumbnail') {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert('File is too large. Please select an image under 2MB.');
        input.value = ''; // Reset file input
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        if (type === 'poster') {
          this.newMedia.posterUrl = result;
        } else {
          this.newMedia.thumbnailUrl = result;
        }
        this.newMedia = { ...this.newMedia };
      };
      reader.readAsDataURL(file);
    }
  }

  toggleLanguage(lang: string, type: 'audio' | 'subtitle') {
    const langArray = type === 'audio' ? this.newMedia.audioLanguages : this.newMedia.subtitleLanguages;
    const index = langArray.indexOf(lang);

    if (index > -1) {
      langArray.splice(index, 1);
    } else {
      langArray.push(lang);
    }
  }

  addSeason() {
    this.newMedia.seasons.push({ seasonNumber: this.newMedia.seasons.length + 1, episodes: [] });
  }

  removeSeason(seasonIndex: number) {
    this.newMedia.seasons.splice(seasonIndex, 1);
  }

  addEpisode(seasonIndex: number) {
    const season = this.newMedia.seasons[seasonIndex];
    season.episodes.push({
      episodeNumber: season.episodes.length + 1,
      title: '',
      sourceUrl: '',
      thumbnailUrl: NO_EPISODE_THUMBNAIL_URL,
    });
  }

  removeEpisode(seasonIndex: number, episodeIndex: number) {
    this.newMedia.seasons[seasonIndex].episodes.splice(episodeIndex, 1);
  }

  resetNewMediaForm() {
     this.newMedia = {
      title: '',
      description: '',
      posterUrl: NO_POSTER_URL,
      thumbnailUrl: NO_THUMBNAIL_URL,
      releaseYear: new Date().getFullYear(),
      genre: '',
      tags: '',
      type: 'Movie',
      audioLanguages: [],
      subtitleLanguages: [],
      isProtected: false,
      licenseServerUrl: '',
      ageRating: 'G',
      sourceUrl: '',
      seasons: [],
    };
  }

  startEdit(media: Media) {
    this.editingMediaId.set(media.id);
    this.newMedia = {
      title: media.title,
      description: media.description,
      posterUrl: media.posterUrl,
      thumbnailUrl: media.thumbnailUrl || NO_THUMBNAIL_URL,
      releaseYear: media.releaseYear,
      genre: media.genre.join(', '),
      tags: media.tags ? media.tags.join(', ') : '',
      type: media.type,
      audioLanguages: [...media.audioLanguages],
      subtitleLanguages: [...media.subtitleLanguages],
      isProtected: media.isProtected,
      licenseServerUrl: media.licenseServerUrl || '',
      ageRating: media.ageRating,
      sourceUrl: media.sourceUrl || '',
      seasons: media.seasons ? JSON.parse(JSON.stringify(media.seasons)) : [], // Deep copy
    };
    this.editFormSection.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }

  cancelEdit() {
    this.editingMediaId.set(null);
    this.resetNewMediaForm();
  }

  saveMedia() {
    if (!this.newMedia.title || !this.newMedia.description) return;
    
    const mediaData: any = {
      title: this.newMedia.title,
      description: this.newMedia.description,
      posterUrl: this.newMedia.posterUrl,
      thumbnailUrl: this.newMedia.thumbnailUrl,
      releaseYear: Number(this.newMedia.releaseYear),
      genre: this.newMedia.genre.split(',').map(g => g.trim()).filter(g => g),
      tags: this.newMedia.tags.split(',').map(t => t.trim()).filter(t => t),
      type: this.newMedia.type,
      audioLanguages: this.newMedia.audioLanguages,
      subtitleLanguages: this.newMedia.subtitleLanguages,
      isProtected: this.newMedia.isProtected,
      licenseServerUrl: this.newMedia.isProtected ? this.newMedia.licenseServerUrl : undefined,
      ageRating: this.newMedia.ageRating,
    };

    if (this.newMedia.type === 'Movie') {
      mediaData.sourceUrl = this.newMedia.sourceUrl;
      mediaData.seasons = [];
    } else {
      mediaData.seasons = this.newMedia.seasons;
      mediaData.sourceUrl = undefined;
    }

    const idToEdit = this.editingMediaId();
    if (idToEdit !== null) {
      this.movieService.updateMedia(idToEdit, mediaData);
      alert(this.translationService.translate('alertMediaUpdated'));
    } else {
      this.movieService.addMedia(mediaData);
      alert(this.translationService.translate('alertMediaAdded'));
    }
    
    this.cancelEdit();
  }

  deleteMedia(mediaId: number) {
    if (confirm(this.translationService.translate('alertConfirmDelete'))) {
      this.movieService.deleteMedia(mediaId);
    }
  }
  
  saveSettings() {
    this.settingsService.updateSettings({
        siteName: this.siteName(),
        maintenanceMode: {
            enabled: this.maintenanceEnabled(),
            message: this.maintenanceMessage()
        }
    });
    alert(this.translationService.translate('alertSettingsSaved'));
  }
}
