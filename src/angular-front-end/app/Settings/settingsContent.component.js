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
var planner_service_1 = require('../services/planner.service');
var user_service_1 = require('../services/user.service');
var common_1 = require('@angular/common');
var themeService = new mockdata_service_1.DomData();
var styleUrl = themeService.getSettings().selectedStyle.StyleUrl;
var templateUrl = themeService.getSettings().selectedStyle.TemplateUrl;
var settingsContent = (function () {
    function settingsContent(protalService, canvasService, userService) {
        this.protalService = protalService;
        this.canvasService = canvasService;
        this.userService = userService;
        this.username = '';
        this.user = {
            firstName: '',
            lastName: '',
            gradYear: ''
        };
        this.gradeRange = [];
        this.isLoggedIn = false;
    }
    settingsContent.prototype.ngOnInit = function () {
        var _this = this;
        this.userService.getInfo().subscribe(function (userInfo) {
            if (userInfo.error) {
                _this.errMsg = userInfo.error + ' (this is not a connection problem)';
            }
            else {
                _this.isLoggedIn = true;
                _this.username = userInfo.user.user;
                _this.user.firstName = userInfo.user.firstName;
                _this.user.lastName = userInfo.user.lastName;
                _this.user.gradYear = userInfo.user.gradYear;
            }
        }, function (error) {
            _this.errMsg = 'Connection Error: ' + error;
        });
        this.userService.getGradeRange().subscribe(function (gradeRange) {
            _this.gradeRange = gradeRange.gradYears;
        }, function (error) {
            console.log(error);
        });
    };
    settingsContent = __decorate([
        core_1.Component({
            selector: 'app-content',
            templateUrl: templateUrl,
            styleUrls: [styleUrl],
            providers: [planner_service_1.PortalService, planner_service_1.CanvasService, user_service_1.UserService],
            directives: [common_1.NgFor, common_1.NgIf]
        }), 
        __metadata('design:paramtypes', [planner_service_1.PortalService, planner_service_1.CanvasService, user_service_1.UserService])
    ], settingsContent);
    return settingsContent;
}());
exports.settingsContent = settingsContent;
//# sourceMappingURL=settingsContent.component.js.map