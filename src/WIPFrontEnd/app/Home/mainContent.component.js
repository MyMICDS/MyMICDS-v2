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
var progress_component_1 = require('./progress/progress.component');
var mockdata_service_1 = require('../mockdata.service');
//import {NgIf} from '@angular/common'
var _navService = new mockdata_service_1.DomData();
var styleUrl = _navService.getMain().selectedStyle.StyleUrl;
var templateUrl = _navService.getMain().selectedStyle.TemplateUrl;
var i;
var mainContent = (function () {
    function mainContent(_DomService) {
        this._DomService = _DomService;
        this.end_time = 15.25;
        this.percentage = 0;
        this.current_class = { class: 'E', class_percentage: 50 }; //figure out a way to dsiplay the percentage
        this.rotation_day = _DomService.getProgress().classData.day;
        this.date = this.getDate();
        this.date.dayInWeek == 'Wednesday' ? this.start_time = 9 : this.start_time = 8;
        this.date.dayInWeek == 'Saturday' || this.date.dayInWeek == 'Sunday' ? this.school_avaliable = false : this.school_avaliable = true;
        this.schedule = _DomService.getProgress().classData.schedule;
    }
    mainContent.prototype.getDate = function () {
        var d = new Date();
        var week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return {
            year: d.getFullYear(),
            month: d.getMonth(),
            day: d.getDate(),
            hours: d.getHours(),
            minutes: d.getMinutes(),
            seconds: d.getSeconds(),
            dayInWeek: week[d.getDay()],
            dateString: d.toString()
        };
    };
    ;
    mainContent.prototype.ngOnInit = function () {
        var _this = this;
        var duration = (this.end_time - this.start_time) * 3600;
        i = setInterval(function () {
            _this.date = _this.getDate();
            if (_this.school_avaliable) {
                var elapsed_time = _this.date.hours * 3600 + _this.date.minutes * 60 + _this.date.seconds - _this.start_time * 3600;
                var percentage = Math.round((elapsed_time / duration) * 10000) / 100;
                if (percentage >= 100) {
                    _this.school_avaliable = false;
                }
                else {
                    _this.school_avaliable = true;
                    _this.percentage = percentage;
                }
                ;
            }
        }, 100);
    };
    mainContent.prototype.ngOnDestroy = function () { clearInterval(i); };
    ;
    mainContent = __decorate([
        core_1.Component({
            selector: 'app-content',
            templateUrl: templateUrl,
            styleUrls: [styleUrl],
            directives: [progress_component_1.MyProgress]
        }), 
        __metadata('design:paramtypes', [mockdata_service_1.DomData])
    ], mainContent);
    return mainContent;
}());
exports.mainContent = mainContent;
//# sourceMappingURL=mainContent.component.js.map