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
var planner_service_1 = require('../services/planner.service');
var common_1 = require('@angular/common');
var _navService = new mockdata_service_1.DomData();
var styleUrl = _navService.getMain().selectedStyle.StyleUrl;
var templateUrl = _navService.getMain().selectedStyle.TemplateUrl;
var i;
var mainContent = (function () {
    function mainContent(portalService) {
        this.portalService = portalService;
        this.end_time = 15.25;
        this.percentage = 0;
        this.date = this.getDate();
        this.date.dayInWeek == 'Wednesday' ? this.start_time = 9 : this.start_time = 8;
        this.date.dayInWeek == 'Saturday' || this.date.dayInWeek == 'Sunday' ? this.school_avaliable = false : this.school_avaliable = true;
        this.schedule = { day: 0, classes: [], allDay: [] };
        this.current_class = { class: '', percentage: 0 };
        this.class_times = [{ start: '', end: '' }];
        this.rotation_day = 0;
    }
    mainContent.prototype.getDate = function () {
        var d = new Date();
        var week = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
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
    ;
    mainContent.prototype.getSchedule = function (date) {
        var _this = this;
        this.portalService.getSchedule(date).subscribe(function (scheduleData) {
            if (scheduleData.error) {
                _this.errorMsg = scheduleData.error;
                console.log('Error getting schedule: ' + _this.errorMsg);
            }
            else {
                _this.schedule = scheduleData.schedule;
                _this.rotation_day = scheduleData.schedule.day;
                _this.scheduleReady = true;
            }
        }, function (error) {
            _this.errorMsg = error;
        });
    };
    mainContent.prototype.getHrMin = function (date) {
        var hrs, min;
        date.getHours() == 0 ? hrs = "00" : hrs = date.getHours().toString();
        date.getMinutes() == 0 ? min = "00" : min = date.getMinutes().toString();
        return hrs + ':' + min;
    };
    mainContent.prototype.calcPercentage = function () {
        var duration = (this.end_time - this.start_time) * 3600;
        this.date = this.getDate();
        if (this.school_avaliable) {
            var elapsed_time = this.date.hours * 3600 + this.date.minutes * 60 + this.date.seconds - this.start_time * 3600;
            var percentage = Math.round((elapsed_time / duration) * 10000) / 100;
            if (percentage >= 100 || percentage < 0) {
                this.school_avaliable = false;
                var date = { year: this.getDate().year, month: this.getDate().month, day: this.getDate().day + 1 };
                this.getSchedule(date);
            }
            else {
                this.school_avaliable = true;
                this.percentage = percentage;
                var classes = this.schedule.classes;
                for (var i_1 = 0; i_1 < classes.length; i_1++) {
                    var cStart = new Date(classes[i_1].start);
                    var cEnd = new Date(classes[i_1].end);
                    this.class_times[i_1] = { start: this.getHrMin(cStart), end: this.getHrMin(cEnd) };
                    var csElapsed = cStart.getHours() * 3600 + cStart.getMinutes() * 60 + cStart.getSeconds() - this.start_time * 3600;
                    var ceElapsed = cEnd.getHours() * 3600 + cEnd.getMinutes() * 60 + cEnd.getSeconds() - this.start_time * 3600;
                    if (csElapsed < elapsed_time && ceElapsed > elapsed_time) {
                        this.current_class.class = classes[i_1].name;
                        this.current_class.percentage = Math.round((elapsed_time - csElapsed) / (ceElapsed - csElapsed) * 10000) / 100;
                    }
                }
            }
            ;
        }
    };
    mainContent.prototype.ngOnInit = function () {
        var _this = this;
        var date = { year: this.getDate().year, month: this.getDate().month + 1, day: this.getDate().day };
        this.getSchedule(date);
        i = setInterval(function () {
            _this.calcPercentage();
        }, 100);
    };
    mainContent.prototype.ngOnDestroy = function () { clearInterval(i); };
    mainContent = __decorate([
        core_1.Component({
            selector: 'app-content',
            templateUrl: templateUrl,
            styleUrls: [styleUrl],
            directives: [progress_component_1.MyProgress, common_1.NgFor, common_1.NgIf],
            providers: [planner_service_1.PortalService]
        }), 
        __metadata('design:paramtypes', [planner_service_1.PortalService])
    ], mainContent);
    return mainContent;
}());
exports.mainContent = mainContent;
//# sourceMappingURL=mainContent.component.js.map