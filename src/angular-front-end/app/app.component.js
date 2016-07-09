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
var nav_component_1 = require('./navbar/nav.component');
var background_component_1 = require('./background.component');
var mockdata_service_1 = require('./mockdata.service');
var http_1 = require('@angular/http');
//components to add to the precompile array
var mainContent_component_1 = require('./Home/mainContent.component');
var lunchContent_component_1 = require('./Lunch/lunchContent.component');
var plannerContent_component_1 = require('./Planner/plannerContent.component');
var profileContent_component_1 = require('./Profile/profileContent.component');
var settingsContent_component_1 = require('./Settings/settingsContent.component');
var accountContent_component_1 = require('./Account/accountContent.component');
var protected_component_1 = require('./protected/protected.component');
var AppComponent = (function () {
    function AppComponent() {
    }
    AppComponent = __decorate([
        core_1.Component({
            selector: 'mymicds-app',
            template: "\n    <div class=\"fluid-container\">\n    <my-bg></my-bg>\n    <my-nav></my-nav>\n    </div>",
            directives: [background_component_1.BgComponent, nav_component_1.NavComponent],
            providers: [mockdata_service_1.DomData, http_1.HTTP_PROVIDERS],
            styleUrls: ['./css/main.css'],
            precompile: [mainContent_component_1.mainContent, lunchContent_component_1.lunchContent, plannerContent_component_1.plannerContent, profileContent_component_1.profileContent, settingsContent_component_1.settingsContent, accountContent_component_1.accountContent, protected_component_1.ProtectedComponent]
        }), 
        __metadata('design:paramtypes', [])
    ], AppComponent);
    return AppComponent;
}());
exports.AppComponent = AppComponent;
//# sourceMappingURL=app.component.js.map