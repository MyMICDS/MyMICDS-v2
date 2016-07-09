"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var router_1 = require('@angular/router');
var core_1 = require('@angular/core');
var mockdata_service_1 = require('../mockdata.service');
var common_1 = require('@angular/common');
var platform_browser_1 = require('@angular/platform-browser');
var router_2 = require('@angular/router');
var login_component_1 = require('../Login/login.component');
var _navService = new mockdata_service_1.DomData();
var styleUrl = _navService.getNav().selectedStyle.StyleUrl;
var templateUrl = _navService.getNav().selectedStyle.TemplateUrl;
var NavComponent = (function () {
    function NavComponent(_titleService, _DomService, router) {
        this._titleService = _titleService;
        this._DomService = _DomService;
        this.router = router;
        this.blur = [false, false, false, false, false];
        this.isActive = [true, false, false, false, false];
        this.pages = this._DomService.getNav().navTitles;
        this.isLoggedIn = false;
    }
    NavComponent.prototype.restore = function (x) {
        for (var i = 0; i < this.isActive.length; i++) {
            this.isActive[i] = false;
        }
    };
    NavComponent.prototype.magnify = function (x) {
        this.restore(x);
        this.isActive[x] = true;
    };
    NavComponent.prototype.applyBlur = function (x) {
        for (var i = 0; i < this.blur.length; i++) {
            if (i != x) {
                this.blur[i] = true;
            }
        }
    };
    NavComponent.prototype.removeBlur = function (x) {
        for (var i = 0; i < this.blur.length; i++) {
            this.blur[i] = false;
        }
    };
    NavComponent.prototype.mouseEnter = function (x) {
        this.applyBlur(x);
    };
    NavComponent.prototype.mouseLeave = function (x) {
        this.removeBlur(x);
    };
    NavComponent.prototype.navigateTo = function (x) {
        this.router.navigate(['/' + this.pages[x]]);
        this._titleService.setTitle('MyMCIDS-' + this._DomService.getNav().navTitles[x]);
    };
    NavComponent.prototype.navigateToProtected = function () {
        this.router.navigate(['/protected']);
        this._titleService.setTitle('Restricted Area');
    };
    NavComponent.prototype.onSelect = function (x) {
        var _this = this;
        this.restore(x);
        this.magnify(x);
        this.previousSelectedPage = this.selectedPage;
        this.selectedPage = this._DomService.getNav().navTitles[x];
        if (this.previousSelectedPage != this.selectedPage) {
            var p = new Promise(function (resolve, reject) {
                document.getElementById("my-fadeout").className += "fade-out";
                setTimeout(function () { resolve(''); }, 300);
            });
            p.then(function () {
                if (_this.pages[x] === 'Settings') {
                    if (_this.isLoggedIn) {
                        _this.navigateTo(x);
                    }
                    else {
                        _this.navigateToProtected();
                    }
                }
                else {
                    _this.navigateTo(x);
                }
            }).catch(function (e) {
                console.error(e);
                if (_this.pages[x] === 'Settings') {
                    if (_this.isLoggedIn) {
                        _this.navigateTo(x);
                    }
                    else {
                        _this.navigateToProtected();
                    }
                }
                else {
                    _this.navigateTo(x);
                }
            });
        }
    };
    NavComponent.prototype.onLogin = function (state) {
        console.log('login event heard');
        this.isLoggedIn = state;
        var num = this.pages.indexOf(this.selectedPage);
        if (this.selectedPage === 'Settings') {
            if (this.isLoggedIn) {
                this.navigateTo(num);
            }
            else {
                this.navigateToProtected();
            }
        }
        else {
            this.navigateTo(num);
        }
        //this.router.navigate(['/'+this.selectedPage])
        //this._titleService.setTitle('MyMCIDS-'+this.selectedPage);
    };
    NavComponent.prototype.ngOnInit = function () {
        var _this = this;
        //activate the correct navbar item
        this.router.events.subscribe(function (event) {
            if (event instanceof router_2.NavigationEnd) {
                var selectedPage = event.urlAfterRedirects.split('/').pop();
                var num = _this.pages.indexOf(selectedPage);
                _this.magnify(num);
                if (selectedPage == 'protected') {
                    _this.navigateTo(0);
                }
            }
        });
        //mechanic to replace the broken authguard
        this.router.events.subscribe(function (event) {
            if (event instanceof router_2.NavigationStart) {
                var selectedPage = event.url.split('/').pop();
                var num = _this.pages.indexOf(selectedPage);
                if (selectedPage === 'Settings') {
                    if (!_this.isLoggedIn) {
                        _this.navigateToProtected();
                    }
                }
            }
        });
    };
    NavComponent = __decorate([
        core_1.Component({
            selector: 'my-nav',
            templateUrl: templateUrl,
            directives: [common_1.NgClass, router_1.ROUTER_DIRECTIVES, common_1.NgIf, common_1.NgFor, login_component_1.LoginComponent],
            providers: [mockdata_service_1.DomData],
            styleUrls: [styleUrl]
        }), 
        __metadata('design:paramtypes', [platform_browser_1.Title, mockdata_service_1.DomData, router_2.Router])
    ], NavComponent);
    return NavComponent;
}());
exports.NavComponent = NavComponent;
//# sourceMappingURL=nav.component.js.map