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
var platform_browser_1 = require('@angular/platform-browser');
var common_1 = require('@angular/common');
var d = new Date();
var date = {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate()
};
var _navService = new mockdata_service_1.DomData();
var styleUrl = _navService.getLunch(date).selectedStyle.StyleUrl;
var templateUrl = _navService.getLunch(date).selectedStyle.TemplateUrl;
var lunchContent = (function () {
    function lunchContent(dataService, DomSanitizationService) {
        this.dataService = dataService;
        this.DomSanitizationService = DomSanitizationService;
        this.date = date;
        var lunchObj = dataService.getLunch(this.date);
        this.lunchSpecial = lunchObj.lunchSpecial;
        this.lunchState = lunchObj.lunchState;
        this.lunch = lunchObj.lunch;
        this.stations = lunchObj.stations;
        this.imgLinks = lunchObj.imgLinks;
        //DomSanitizationService.bypassSecurityTrustStyle("transform 0.4s cubic-bezier(0.445, 0.05, 0.55, 0.95)");
    }
    ;
    lunchContent = __decorate([
        core_1.Component({
            selector: 'app-content',
            templateUrl: templateUrl,
            styleUrls: [styleUrl],
            directives: [common_1.NgClass, common_1.NgFor, common_1.NgIf],
            providers: [mockdata_service_1.DomData]
        }), 
        __metadata('design:paramtypes', [mockdata_service_1.DomData, platform_browser_1.DomSanitizationService])
    ], lunchContent);
    return lunchContent;
}());
exports.lunchContent = lunchContent;
//# sourceMappingURL=lunchContent.component.js.map