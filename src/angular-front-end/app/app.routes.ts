import {RouterConfig} from '@angular/router';
import {provideRouter} from '@angular/router';
import {mainContent} from './Home/mainContent.component';
import {lunchContent} from './Lunch/lunchContent.component';
import {plannerContent} from './Planner/plannerContent.component';
import {profileContent} from './Profile/profileContent.component'
import {settingsContent} from './Settings/settingsContent.component'
import {accountContent} from './Account/accountContent.component';
import {ProtectedComponent} from './Protected/protected.component'
import {AuthGuard} from './auth.guard';
import {AuthService} from './services/auth.service'

export const routes: RouterConfig = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: mainContent },
  { path: 'lunch', component: lunchContent },
  { path: 'planner', component: plannerContent },
  { path: 'settings', component: settingsContent, canActivate: [AuthGuard] },
  { path: 'protected', component: ProtectedComponent }
];

export const APP_ROUTER_PROVIDERS = [
  provideRouter(routes),
  AuthService, AuthGuard
];
