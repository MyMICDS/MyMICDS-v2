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
var mockdata_service_1 = require('../../mockdata.service');
function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    var angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
}
function describeArc(x, y, radius, startAngle, endAngle) {
    var start = polarToCartesian(x, y, radius, endAngle);
    var end = polarToCartesian(x, y, radius, startAngle);
    var arcSweep = endAngle - startAngle <= 180 ? "0" : "1";
    var d = [
        "M", start.x, start.y,
        "A", radius, radius, 0, arcSweep, 0, end.x, end.y
    ].join(" ");
    return d;
}
var _navService = new mockdata_service_1.DomData();
var styleUrl = _navService.getProgress().selectedStyle.StyleUrl;
var templateUrl = _navService.getProgress().selectedStyle.TemplateUrl;
var MyProgress = (function () {
    function MyProgress(_DomService) {
        this._DomService = _DomService;
        this.polarToCartesian = polarToCartesian;
        this.describeArc = describeArc;
        this.click = false;
        this.percentage = _DomService.getProgress().classData.overall_percentage;
        this.current_class = _DomService.getProgress().classData.current_class;
        this.current_percentage = _DomService.getProgress().classData.current_percentage;
    }
    ;
    //TODO: use [attr] to set stroke-width, delete thinner() then
    MyProgress.prototype.thinner = function () {
        this.click ? document.getElementById("outer").setAttribute("stroke-width", "25px") : document.getElementById("outer").setAttribute("stroke-width", "50px");
        this.click ? document.getElementById("inner").setAttribute("stroke-width", "15px") : document.getElementById("inner").setAttribute("stroke-width", "30px");
    };
    MyProgress = __decorate([
        core_1.Component({
            selector: 'my-progress',
            templateUrl: templateUrl,
            styleUrls: [styleUrl],
            providers: [mockdata_service_1.DomData]
        }), 
        __metadata('design:paramtypes', [mockdata_service_1.DomData])
    ], MyProgress);
    return MyProgress;
}());
exports.MyProgress = MyProgress;
//# sourceMappingURL=progress.component.js.map