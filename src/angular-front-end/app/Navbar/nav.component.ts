import {ROUTER_DIRECTIVES} from '@angular/router';
import {Component} from '@angular/core';
import {DomData} from '../mockdata.service';
import {NgClass, NgIf, NgFor} from '@angular/common';
import {Title} from '@angular/platform-browser';
import {Router, NavigationEnd, NavigationStart} from '@angular/router';
import {LoginComponent} from '../Login/login.component';


var _navService = new DomData();
var styleUrl = _navService.getNav().selectedStyle.StyleUrl;
var templateUrl = _navService.getNav().selectedStyle.TemplateUrl;

@Component({
    selector: 'my-nav',
    templateUrl: templateUrl,
    directives: [NgClass, ROUTER_DIRECTIVES, NgIf, NgFor, LoginComponent],
    providers: [DomData],
    styleUrls: [styleUrl]
})

export class NavComponent {
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

    public constructor(private _titleService: Title, private _DomService: DomData, private router:Router) { }
    public pages = this._DomService.getNav().navTitles

    public selectedPage: string = this.router.url.split('/').pop();
    private previousSelectedPage: string;

    private navigateTo(x:number) {
        this.router.navigate(['/' + this.pages[x]]);
        let navTitle = this._DomService.getNav().navTitles[x];
        let navTitleCaps = navTitle.charAt(0).toUpperCase() + navTitle.slice(1);
        this._titleService.setTitle('MyMICDS - '+navTitleCaps);
    }

    private navigateToProtected() {
        this.router.navigate(['/protected']);
        this._titleService.setTitle('Restricted Area')
    }

    public onSelect(x: number):void {
        this.restore(x);
        this.magnify(x);
        this.previousSelectedPage = this.selectedPage;
        this.selectedPage = this._DomService.getNav().navTitles[x];
        if (this.previousSelectedPage != this.selectedPage) {
            const p: Promise<string> = new Promise (
            (resolve: (str: string)=>void, reject: (str: string)=>void) => {
                document.getElementById("my-fadeout").className += "fade-out";
                setTimeout(() => {resolve('')}, 300)
            }
            );
            p.then(() => {
                if (this.pages[x]==='Settings') {
                    if (this.isLoggedIn) {
                        this.navigateTo(x)
                    } else {
                        this.navigateToProtected();
                    }
                } else {
                    this.navigateTo(x);
                }
            }).catch((e)=> {
                console.error(e);
                if (this.pages[x]==='Settings') {
                    if (this.isLoggedIn) {
                        this.navigateTo(x)
                    } else {
                        this.navigateToProtected();
                    }
                } else {
                    this.navigateTo(x);
                }
            });
        }
    }

    public isLoggedIn: boolean = false;

    onLogin(state: boolean) {
        console.log('login event heard')
        this.isLoggedIn = state;
        let num = this.pages.indexOf(this.selectedPage);
        if (this.selectedPage) {
            if (this.selectedPage==='Settings') {
                if (this.isLoggedIn) {
                    this.navigateTo(num)
                } else {
                    this.navigateToProtected();
                }
            } else {
                this.navigateTo(num);
            }
        }
        //this.router.navigate(['/'+this.selectedPage])
        //this._titleService.setTitle('MyMCIDS-'+this.selectedPage);
    }

    ngOnInit() {
        //activate the correct navbar item
        this.router.events.subscribe(event => {
            if(event instanceof NavigationEnd) {
                let selectedPage = event.urlAfterRedirects.split('/').pop();
                let num = this.pages.indexOf(selectedPage);
                this.magnify(num);
                if (!this.selectedPage && selectedPage=='protected') {
                    this.navigateTo(0);
                }
            }
        });
        //mechanic to replace the broken authguard
        this.router.events.subscribe(event => {
            if(event instanceof NavigationStart) {
                let selectedPage = event.url.split('/').pop();
                let num = this.pages.indexOf(selectedPage);
                if (selectedPage==='Settings') {
                    if (!this.isLoggedIn) {
                        this.navigateToProtected();
                    }
                }
            }
        })
    }

}
