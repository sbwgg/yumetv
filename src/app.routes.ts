
import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { AdminComponent } from './pages/admin/admin.component';
import { authGuard } from './services/auth.guard';
import { RegisterComponent } from './pages/register/register.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { loggedInGuard } from './services/loggedIn.guard';
import { PlayerComponent } from './pages/player/player.component';
import { BrowseComponent } from './pages/browse/browse.component';
import { MediaInfoComponent } from './pages/media-info/media-info.component';
import { CommunityComponent } from './pages/community/community.component';
import { PostDetailComponent } from './pages/post-detail/post-detail.component';
import { VerifyEmailComponent } from './pages/verify-email/verify-email.component';

export const APP_ROUTES: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full' },
  { path: 'browse', component: BrowseComponent },
  { path: 'community', component: CommunityComponent },
  { path: 'community/post/:id', component: PostDetailComponent },
  { path: 'media/:id', component: MediaInfoComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'verify-email/:token', component: VerifyEmailComponent },
  { path: 'admin', component: AdminComponent, canActivate: [authGuard] },
  { path: 'profile/:id', component: ProfileComponent },
  { path: 'settings', component: SettingsComponent, canActivate: [loggedInGuard] },
  { path: 'watch/movie/:id', component: PlayerComponent },
  { path: 'watch/tv/:id/s/:season/e/:episode', component: PlayerComponent },
  { path: '**', redirectTo: '' }
];