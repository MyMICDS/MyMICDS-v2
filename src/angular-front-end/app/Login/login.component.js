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
var core_1 = require('@angular/core');
var auth_service_1 = require('../services/auth.service');
var user_service_1 = require('../services/user.service');
var mockdata_service_1 = require('../mockdata.service');
var common_1 = require('@angular/common');
var router_1 = require('@angular/router');
var styleService = new mockdata_service_1.DomData();
var styleUrl = styleService.getLogin().selectedStyle.StyleUrl;
var templateUrl = styleService.getLogin().selectedStyle.TemplateUrl;
var LoginComponent = (function () {
    function LoginComponent(router, authService, userService) {
        this.router = router;
        this.authService = authService;
        this.userService = userService;
        this.onLogin = new core_1.EventEmitter();
        this.loginModel = {
            user: '',
            password: '',
            remember: '',
        };
        this.formActive = true;
    }
    LoginComponent.prototype.onClickLogin = function () {
        var _this = this;
        this.authService.logIn(this.loginModel).subscribe(function (loginRes) {
            _this.loginRes = loginRes;
            if (loginRes.error) {
                _this.errorMessage = loginRes.error;
                console.log(_this.errorMessage);
            }
            else {
                _this.isLoggedIn = true;
                $('#loginModal').modal('hide');
                _this.onLogin.emit(true);
                _this.userService.getInfo().subscribe(function (userInfo) {
                    if (userInfo.error) {
                        _this.userErrMsg = userInfo.error;
                    }
                    else {
                        _this.userName = userInfo.user.firstName + ' ' + userInfo.user.lastName;
                    }
                }, function (error) {
                    _this.userErrMsg = error;
                });
                if (loginRes.cookie.token) {
                    document.cookie = 'rememberme=' + loginRes.cookie.selector + ':' + loginRes.cookie.token + '; expires=' + loginRes.cookie.expires;
                }
            }
        }, function (error) {
            _this.errorMessage = error;
            console.log('If this keeps happening, contact the support!');
        });
    };
    LoginComponent.prototype.onClickLogout = function () {
        var _this = this;
        this.authService.logOut().subscribe(function (logoutRes) {
            if (logoutRes.error) {
                console.log(logoutRes.error);
            }
            else {
                _this.isLoggedIn = false;
                _this.onLogin.emit(false);
            }
        }, function (error) {
            console.error(error);
        });
    };
    LoginComponent.prototype.onClickAccount = function () {
        this.router.navigate(['/Account']);
    };
    LoginComponent.prototype.ngOnInit = function () {
        var _this = this;
        this.userService.getInfo().subscribe(function (info) {
            if (info.error) {
                _this.isLoggedIn = false;
                _this.onLogin.emit(false);
            }
            else {
                _this.onLogin.emit(true);
                _this.isLoggedIn = true;
                _this.userName = info.user.user;
            }
        }, function (error) { _this.isLoggedIn = false; _this.onLogin.emit(true); });
    };
    __decorate([
        core_1.Input(), 
        __metadata('design:type', Boolean)
    ], LoginComponent.prototype, "displayText", void 0);
    __decorate([
        core_1.Output(), 
        __metadata('design:type', Object)
    ], LoginComponent.prototype, "onLogin", void 0);
    LoginComponent = __decorate([
        core_1.Component({
            selector: 'my-login',
            templateUrl: templateUrl,
            directives: [common_1.NgIf],
            providers: [auth_service_1.AuthService, user_service_1.UserService],
            styleUrls: [styleUrl]
        }), 
        __metadata('design:paramtypes', [router_1.Router, auth_service_1.AuthService, user_service_1.UserService])
    ], LoginComponent);
    return LoginComponent;
}());
exports.LoginComponent = LoginComponent;
//# sourceMappingURL=login.component.js.map