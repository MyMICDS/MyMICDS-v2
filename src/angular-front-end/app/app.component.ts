import {ROUTER_DIRECTIVES} from '@angular/router';
import {Component} from '@angular/core';
//import {NavComponent} from './nav.component';
import {BgComponent} from './background.component'
import {mainContent} from './Home/mainContent.component'
import {DomData} from './mockdata.service';
import {NgClass, NgIf, NgFor, NgForm} from '@angular/common';
import { Title } from '@angular/platform-browser';
import {Router} from '@angular/router'
import {AuthService} from './services/auth.service'
import {HTTP_PROVIDERS} from '@angular/http';
import {UserService} from './services/user.service'

var _navService = new DomData();
var styleUrl = _navService.getNav().selectedStyle.StyleUrl;
var templateUrl = _navService.getNav().selectedStyle.TemplateUrl;

@Component({
    selector: 'mymicds-app',
    templateUrl: templateUrl,
    directives: [BgComponent, NgClass, ROUTER_DIRECTIVES, NgIf],
    providers: [DomData, AuthService, HTTP_PROVIDERS, UserService],
    styleUrls: ['./css/main.css', styleUrl]
})

export class AppComponent {
  private restore(x):void {
        for (var i=0;i<this.isActive.length;i++) {
                this.isActive[i] = false;
        }
    }
    
    private magnify(x):void {
        this.restore(x);
        this.isActive[x]=true;
    }
    
    private applyBlur(x):void {
        for (var i=0;i<this.blur.length;i++) {
            if (i!=x) {
                this.blur[i] = true;
            }
        }
    }
    private removeBlur(x):void {
        for (var i=0;i<this.blur.length;i++) {
                this.blur[i] = false;
        }
    }
    
    private mouseEnter(x){
        this.applyBlur(x);
    }
    
    private mouseLeave(x){
        this.removeBlur(x);
    }
    private blur:boolean[] = [false,false,false,false,false]
    private isActive:boolean[] = [true,false,false,false,false]
    
    public constructor(private _titleService: Title, private _DomService: DomData, private router:Router, private authService: AuthService, private userService: UserService) { }
    public pages = this._DomService.getNav().navTitles
  //emit events to alert the other components to render the app
    
    public selectedPage: string = 'Home';
    private previousSelectedPage: string;
    public onSelect(x: number):void {
        this.restore(x);
        this.magnify(x);
        this.previousSelectedPage = this.selectedPage;
        this.selectedPage = this._DomService.getNav().navTitles[x];
        if (this.previousSelectedPage != this.selectedPage) {
            const p: Promise<string> = new Promise (
            (resolve: (str: string)=>void, reject: (str: string)=>void) => {
                document.getElementById("my-fadeout").className += "fade-out";
                setTimeout(() => {resolve('')}, 400)
            }
            );
            p.then(() => {
                this.router.navigate(['/' + this.pages[x]]);
                this._titleService.setTitle("MockUp-"+this._DomService.getNav().navTitles[x]);
            }).catch((e)=> {
                console.log(e);
                this.router.navigate(['/' + this.pages[x]]);
                this._titleService.setTitle("MockUp-"+this._DomService.getNav().navTitles[x]);
            });
        }
    }

    //form related variables and methods
    //todo: separate this into another component
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
                    this.router.navigate(['/'+this.selectedPage]);
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