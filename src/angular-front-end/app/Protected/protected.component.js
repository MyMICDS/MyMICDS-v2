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
var login_component_1 = require('../Login/login.component');
var ProtectedComponent = (function () {
    function ProtectedComponent() {
    }
    ProtectedComponent = __decorate([
        core_1.Component({
            selector: 'app-content',
            template: "\n    <div class=\"my-top-content\">\n        <div class=\"jumbotron\">\n            <h1 class=\"display-3\">Please log in before you continue.</h1>\n            <my-login [displayText]=\"false\" (onLogin)=\"console.log('logged In')\"></my-login>\n        </div>\n    </div>",
            styles: ['h1 {color: black} .my-top-content {margin-top: 100px}'],
            providers: [],
            directives: [login_component_1.LoginComponent]
        }), 
        __metadata('design:paramtypes', [])
    ], ProtectedComponent);
    return ProtectedComponent;
}());
exports.ProtectedComponent = ProtectedComponent;
//# sourceMappingURL=protected.component.js.map