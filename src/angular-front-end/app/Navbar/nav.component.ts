import {ROUTER_DIRECTIVES} from '@angular/router';
import {Component} from '@angular/core';
import {DomData} from '../mockdata.service';
import {NgClass, NgIf, NgFor} from '@angular/common';
import { Title } from '@angular/platform-browser';
import {Router, NavigationEnd} from '@angular/router';
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
    
    public selectedPage: string;
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
                setTimeout(() => {resolve('')}, 300)
            }
            );
            p.then(() => {
                this.router.navigate(['/' + this.pages[x]]);
                this._titleService.setTitle("MockUp-"+this._DomService.getNav().navTitles[x]);
            }).catch((e)=> {
                console.error(e);
                this.router.navigate(['/' + this.pages[x]]);
                this._titleService.setTitle("MockUp-"+this._DomService.getNav().navTitles[x]);
            });
        }
    }

    public isLoggedIn: boolean;

    ngOnInit() {
        this.router.events.subscribe(event => {
            if(event instanceof NavigationEnd) {
                this.selectedPage = event.urlAfterRedirects.split('/').pop();
                this.magnify(this.pages.indexOf(this.selectedPage));
            }
        })
    }

}