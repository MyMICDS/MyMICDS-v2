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
var common_1 = require('@angular/common');
var mockdata_service_1 = require('../mockdata.service');
var auth_service_1 = require('../services/auth.service');
var user_service_1 = require('../services/user.service');
var _navService = new mockdata_service_1.DomData();
var styleUrl = _navService.getAccount().selectedStyle.StyleUrl;
var templateUrl = _navService.getAccount().selectedStyle.TemplateUrl;
var accountContent = (function () {
    function accountContent(authService, userService) {
        this.authService = authService;
        this.userService = userService;
        this.gradeRange = [];
        this.repeatPass = '';
        this.form = {
            user: '',
            password: '',
            firstName: '',
            lastName: '',
            'grad-year': '',
            teacher: ''
        };
        this.submitted = false;
        this.submitSuccess = false;
        this.errMsg = '';
    }
    accountContent.prototype.ngOnInit = function () {
        var _this = this;
        this.userService.getGradeRange().subscribe(function (gradeRange) {
            _this.gradeRange = gradeRange.gradYears;
            console.log(gradeRange);
        }, function (error) {
            _this.errMsg = error;
            _this.submitted = true;
        });
    };
    accountContent.prototype.onSubmit = function () {
        var _this = this;
        this.submitted = true;
        this.authService.register(this.form).subscribe(function (res) {
            if (res.error) {
                _this.submitSuccess = false;
                _this.submitted = false;
                _this.errMsg = res.error;
            }
            else {
                _this.submitSuccess = true;
                _this.submitted = true;
                console.dir(_this.form);
            }
        }, function (error) {
            _this.errMsg = error;
            _this.submitSuccess = false;
            _this.submitted = false;
        });
    };
    accountContent.prototype.changeEmail = function () {
        this.submitted = false;
        this.submitSuccess = false;
    };
    accountContent = __decorate([
        core_1.Component({
            selector: 'app-content',
            templateUrl: templateUrl,
            styleUrls: [styleUrl],
            directives: [common_1.NgFor],
            providers: [auth_service_1.AuthService, user_service_1.UserService]
        }), 
        __metadata('design:paramtypes', [auth_service_1.AuthService, user_service_1.UserService])
    ], accountContent);
    return accountContent;
}());
exports.accountContent = accountContent;
//# sourceMappingURL=accountContent.component.js.map