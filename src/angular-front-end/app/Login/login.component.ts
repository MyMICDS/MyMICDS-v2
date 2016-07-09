import {Component, Input, Output, EventEmitter} from '@angular/core';
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

    @Input() displayText: boolean;
    @Output() onLogin = new EventEmitter<boolean>()

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
                    this.onLogin.emit(true);
                    this.userService.getInfo().subscribe(
                        userInfo => {
                            if (userInfo.error) {this.userErrMsg = userInfo.error}
                            else {this.userName = userInfo.user.firstName+' '+userInfo.user.lastName}
                        },
                        error => {
                            this.userErrMsg = error;
                        }
                    );
                    if(loginRes.cookie.token) {
						document.cookie = 'rememberme=' + loginRes.cookie.selector + ':' + loginRes.cookie.token + '; expires=' + loginRes.cookie.expires;
					}
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
                if (logoutRes.error) {
                    console.log(logoutRes.error)
                } else {
                    this.isLoggedIn = false;
                    this.onLogin.emit(false);
                }
            },
            error => {
                console.error(error)
            }
        )
    }

    public onClickAccount() {
        this.router.navigate(['/Account'])
    }

    public formActive:boolean = true;

    ngOnInit() {
        this.userService.getInfo().subscribe(
            info => {if (info.error) {this.isLoggedIn = false;this.onLogin.emit(false);
                } else {this.onLogin.emit(true);this.isLoggedIn = true;this.userName=info.user.user}},
            error => {this.isLoggedIn = false;this.onLogin.emit(true);}
        )
    }

}