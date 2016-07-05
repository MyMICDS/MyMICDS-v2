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
var mockdata_service_1 = require('../mockdata.service');
var _navService = new mockdata_service_1.DomData();
var styleUrl = _navService.getAccount().selectedStyle.StyleUrl;
var templateUrl = _navService.getAccount().selectedStyle.TemplateUrl;
var accountContent = (function () {
    function accountContent() {
        this.form = {
            email: '',
            password1: '',
            password2: '',
        };
        this.submitted = false;
        this.submitSuccess = false;
    }
    accountContent.prototype.onSubmit = function () {
        var _this = this;
        var p = new Promise(function (resolve, reject) {
            _this.submitted = true;
            setTimeout(function () { resolve(); }, 6000);
        });
        p.then(function () { return _this.submitSuccess = true; })
            .catch(function (e) { return console.log(e); });
    };
    accountContent = __decorate([
        core_1.Component({
            selector: 'app-content',
            templateUrl: templateUrl,
            styleUrls: [styleUrl],
            directives: []
        }), 
        __metadata('design:paramtypes', [])
    ], accountContent);
    return accountContent;
}());
exports.accountContent = accountContent;
//# sourceMappingURL=accountContent.component.js.map