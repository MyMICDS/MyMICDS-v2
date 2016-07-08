import {Component} from '@angular/core';
import {AuthService} from '../services/auth.service'
import {UserService} from '../services/user.service'
import {DomData} from '../mockdata.service';
import {NgIf, NgForm} from '@angular/common';
import {Router} from '@angular/router'

var styleService = new DomData();
var styleUrl = styleService.getLogin().selectedStyle.StyleUrl;
var templateUrl = styleService.getLogin().selectedStyle.TemplateUrl;

@Component({
    selector: 'my-login',
    templateUrl: templateUrl,
    directives: [NgIf],
    providers: [AuthService, UserService],
    styleUrls: [styleUrl]
})

export class LoginComponent {
    constructor(private router:Router, private authService: AuthService, private userService: UserService) {}

    ngOnInit() {
        console.log('logging out');
        this.onClickLogout();
    }

    public loginModel: {
        user: string;
        password: string;
        remember: any;
    } = {
        user: '',
        password: '',
        remember: '',
    }
    private loginRes: {
        error: string;
        success: boolean;
        cookie: {
            selector:string,
            token:string,
            expires:string
            }
    } 
    public isLoggedIn: boolean;
    public errorMessage:string; 
    public userErrMsg:string;
    public userName:string;
    public onClickLogin() {
        this.authService.logIn(this.loginModel).subscribe(
            loginRes => {
                this.loginRes = loginRes;
                if (loginRes.error) { 
                    this.errorMessage = loginRes.error;
                    console.log(this.errorMessage);
                } else { 
                    this.isLoggedIn = true;
                    $('#loginModal').modal('hide');
                    this.router.navigate([this.router.url]);
                    this.userService.getInfo().subscribe(
                        userInfo => {
                            if (userInfo.error) {this.userErrMsg = userInfo.error}
                            else {this.userName = userInfo.user.firstName+' '+userInfo.user.lastName}
                        },
                        error => {
                            this.userErrMsg = error;
                        }
                    )
                }
            },
            error => {
                this.errorMessage = <any>error;
                console.log('If this keeps happening, contact the support!')
            }
        )
    }

    public onClickLogout() {
        this.authService.logOut().subscribe(
            logoutRes => {
                console.log(logoutRes.error ? logoutRes.error : 'Logout Successful!')
                if (!logoutRes.error) {
                    this.isLoggedIn = false;
                }
            }
        )
    }

    public onClickAccount() {
        this.router.navigate(['/Account'])
    }

    public formActive:boolean = true;
}