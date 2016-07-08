import { Injectable } from'@angular/core';
import { CanActivate } from '@angular/router';
//import { AuthService } from './services/auth.service'

@Injectable()
export class AuthGuard implements CanActivate {
    //constructor (private authService: AuthService) {}

    canActivate() {
        //if (this.authService.testLogin()) {return true;}
        console.info("auth.guard.ts is currently not working...");
        return true;
    }
}