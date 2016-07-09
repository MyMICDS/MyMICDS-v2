import {Component} from '@angular/core';
import {LoginComponent} from '../Login/login.component'

@Component({
    selector: 'app-content',
    template: `
    <div class="my-top-content">
        <div class="jumbotron">
            <h1 class="display-3">Please log in before you continue.</h1>
            <my-login [displayText]="false" (onLogin)="console.log('logged In')"></my-login>
        </div>
    </div>`,
    styles: ['h1 {color: black} .my-top-content {margin-top: 100px}'],
    providers: [],
    directives: [LoginComponent]
})

export class ProtectedComponent {

}