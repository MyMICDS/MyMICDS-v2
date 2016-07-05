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
var styleSettings_1 = require('./styleSettings');
var core_1 = require('@angular/core');
var DomData = (function () {
    function DomData() {
    }
    DomData.prototype.getStyleName = function () {
        return 'default';
    };
    DomData.prototype.getNav = function () {
        var styleName = this.getStyleName();
        var selectedStyle = styleSettings_1.styleList[styleName].navbar;
        return {
            navTitles: ["Home", "Lunch", "Planner", "Settings", "Profile"],
            selectedStyle: selectedStyle
        };
    };
    DomData.prototype.getPlanner = function () {
        var styleName = this.getStyleName();
        var selectedStyle = styleSettings_1.styleList[styleName].planner;
        return { selectedStyle: selectedStyle,
        };
    };
    DomData.prototype.getweather = function () { };
    DomData.prototype.getProgress = function () {
        var styleName = this.getStyleName();
        var selectedStyle = styleSettings_1.styleList[styleName].progress;
        var classData = {
            day: 1,
            schedule: {
                A: "Math",
                B: "English",
                C: "Science",
                D: "History",
                E: "World Language",
                F: "Choir",
                G: "Free"
            }
        };
        return { classData: classData, selectedStyle: selectedStyle };
    };
    //Background services
    DomData.prototype.getBg = function () {
        var bgName = this.getStyleName();
        var selectedBg = styleSettings_1.styleList[bgName].background;
        return selectedBg;
    };
    DomData.prototype.getLunch = function (date) {
        //Five categories: Main Dish, Action station, Soup, Salad Bar and Dessert.
        var styleName = this.getStyleName();
        var selectedStyle = styleSettings_1.styleList[styleName].lunch;
        return {
            selectedStyle: selectedStyle,
            date: date,
            lunchState: true,
            lunchSpecial: 'Lunch',
            lunch: {
                'Main Dish': ['BBQ Beef Sandwiches', 'Veggie burgers', 'Crispy Patatoes', 'steamed Sugar Snap Peas'],
                'Action Station': ['Santa Fe Chiken & rice', 'Panini'],
                'Soup': ['Corn Chowder'],
                'Salad Bar': ['Chefs Salad'],
                'Dessert': ['Jello with whipped topping']
            },
            stations: ['Main Dish', 'Action Station', 'Soup', 'Salad Bar', 'Dessert'],
            imgLinks: ['../assets/a29f20e0gw1f1js9envmbj218c1uo7wh.jpg', '../assets/a29f20e0gw1f1js9j1dpej20ov0xcb26.jpg', '../assets/a29f20e0jw1f1dxiv9p1oj20xc0qfx3t.jpg', '../assets/a29f20e0jw1f1dxj7b2tjj20ow0xcngo.jpg', '../assets/a29f20e0jw1f1dxjf2v4zj20m80ftqes.jpg']
        };
    };
    DomData.prototype.getMain = function () {
        var styleName = this.getStyleName();
        var selectedStyle = styleSettings_1.styleList[styleName].main;
        return { selectedStyle: selectedStyle };
    };
    DomData.prototype.getAccount = function () {
        var styleName = this.getStyleName();
        var selectedStyle = styleSettings_1.styleList[styleName].account;
        return { selectedStyle: selectedStyle };
    };
    DomData.prototype.getProfile = function () {
        var styleName = this.getStyleName();
        var selectedStyle = styleSettings_1.styleList[styleName].profile;
        return { selectedStyle: selectedStyle };
    };
    DomData = __decorate([
        core_1.Injectable(), 
        __metadata('design:paramtypes', [])
    ], DomData);
    return DomData;
}());
exports.DomData = DomData;
//# sourceMappingURL=mockdata.service.js.map