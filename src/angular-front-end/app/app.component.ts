import {Component} from '@angular/core';
import {NavComponent} from './navbar/nav.component';
import {BgComponent} from './background.component'
import {DomData} from './mockdata.service';
import {HTTP_PROVIDERS} from '@angular/http';

//components to add to the precompile array
import {mainContent} from './Home/mainContent.component';
import {lunchContent} from './Lunch/lunchContent.component';
import {plannerContent} from './Planner/plannerContent.component';
import {profileContent} from './Profile/profileContent.component'
import {settingsContent} from './Settings/settingsContent.component'
import {accountContent} from './Account/accountContent.component';


@Component({
    selector: 'mymicds-app',
    template: `
    <div class="fluid-container">
    <my-bg></my-bg>
    <my-nav></my-nav>
    </div>`,
    directives: [BgComponent, NavComponent],
    providers: [DomData, HTTP_PROVIDERS],
    styleUrls: ['./css/main.css'],
    precompile: [mainContent, lunchContent, plannerContent, profileContent, settingsContent, accountContent]
})

export class AppComponent {
  
}