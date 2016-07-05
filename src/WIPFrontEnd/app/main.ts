import {bootstrap}    from '@angular/platform-browser-dynamic';
import {APP_ROUTER_PROVIDERS} from './app.routes';
import { disableDeprecatedForms, provideForms } from '@angular/forms';
import {AppComponent} from './app.component';
import {Title} from '@angular/platform-browser';

bootstrap(AppComponent, 

[Title, APP_ROUTER_PROVIDERS, disableDeprecatedForms(), provideForms()])

.then(
    () => window.console.info( 'Angular finished bootstrapping your application!' ),
    (error) => {
      console.warn( 'Angular was not able to bootstrap your application.' );
      console.error( error );
    }
  );
