import {Component} from '@angular/core';
import {NavComponent} from './navbar/nav.component';
import {BgComponent} from './background.component'
import {DomData} from './mockdata.service';
import {HTTP_PROVIDERS} from '@angular/http';

@Component({
    selector: 'mymicds-app',
    template: `
    <div class="fluid-container">
    <my-bg></my-bg>
    <my-nav></my-nav>
    </div>`,
    directives: [BgComponent, NavComponent],
    providers: [DomData, HTTP_PROVIDERS],
    styleUrls: ['./css/main.css']
})

export class AppComponent {
  
}