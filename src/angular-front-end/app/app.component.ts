import {ROUTER_DIRECTIVES} from '@angular/router';
import {Component} from '@angular/core';
import {NavComponent} from './navbar/nav.component';
import {BgComponent} from './background.component'
import {mainContent} from './Home/mainContent.component'
import {DomData} from './mockdata.service';
import {Router} from '@angular/router'
import {AuthService} from './services/auth.service'
import {HTTP_PROVIDERS} from '@angular/http';
import {UserService} from './services/user.service'

@Component({
    selector: 'mymicds-app',
    template: `
    <div class="fluid-container">
    <my-bg></my-bg>
    <my-nav></my-nav>
    </div>`,
    directives: [BgComponent, NavComponent],
    providers: [DomData, AuthService, HTTP_PROVIDERS, UserService],
    styleUrls: ['./css/main.css']
})

export class AppComponent {
  
}