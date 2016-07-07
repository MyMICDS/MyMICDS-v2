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
require('../rxjs-operators');
var http_1 = require('@angular/http');
var Observable_1 = require('rxjs/Observable');
var http_2 = require('@angular/http');
var PortalService = (function () {
    function PortalService(http) {
        this.http = http;
        this.Url = 'http://localhost:1420/portal';
    }
    PortalService.prototype.extractData = function (res) {
        var body = res.json();
        return body || {};
    };
    PortalService.prototype.handleError = function (error) {
        var errMsg = (error.message) ? error.message :
            error.status ? error.status + " - " + error.statusText : error;
        console.error(errMsg); // log to console instead
        return Observable_1.Observable.throw(errMsg);
    };
    PortalService.prototype.getSchedule = function (date) {
        var body = JSON.stringify(date);
        var headers = new http_2.Headers({ 'Content-Type': 'application/json' });
        var options = new http_2.RequestOptions({ headers: headers });
        return this.http.post(this.Url + '/get-schedule', body, options)
            .map(this.extractData)
            .catch(this.handleError);
    };
    PortalService.prototype.setUrl = function (url) {
        var body = JSON.stringify({ url: url });
        var headers = new http_2.Headers({ 'Content-Type': 'application/json' });
        var options = new http_2.RequestOptions({ headers: headers });
        return this.http.post(this.Url + '/set-url', body, options)
            .map(this.extractData)
            .catch(this.handleError);
    };
    PortalService.prototype.testUrl = function (url) {
        var body = JSON.stringify({ url: url });
        var headers = new http_2.Headers({ 'Content-Type': 'application/json' });
        var options = new http_2.RequestOptions({ headers: headers });
        return this.http.post(this.Url + '/test-url', body, options)
            .map(this.extractData)
            .catch(this.handleError);
    };
    PortalService = __decorate([
        core_1.Injectable(), 
        __metadata('design:paramtypes', [http_1.Http])
    ], PortalService);
    return PortalService;
}());
exports.PortalService = PortalService;
var CanvasService = (function () {
    function CanvasService(http) {
        this.http = http;
        this.Url = 'http://localhost:1420/canvas';
    }
    CanvasService.prototype.extractData = function (res) {
        var body = res.json();
        return body || {};
    };
    CanvasService.prototype.handleError = function (error) {
        var errMsg = (error.message) ? error.message :
            error.status ? error.status + " - " + error.statusText : error;
        console.error(errMsg); // log to console instead
        return Observable_1.Observable.throw(errMsg);
    };
    CanvasService.prototype.getEvents = function (date) {
        var body = JSON.stringify(date);
        var headers = new http_2.Headers({ 'Content-Type': 'application/json' });
        var options = new http_2.RequestOptions({ headers: headers });
        return this.http.post(this.Url + '/get-events', body, options)
            .map(this.extractData)
            .catch(this.handleError);
    };
    CanvasService.prototype.setUrl = function (url) {
        var body = JSON.stringify({ url: url });
        var headers = new http_2.Headers({ 'Content-Type': 'application/json' });
        var options = new http_2.RequestOptions({ headers: headers });
        return this.http.post(this.Url + '/set-url', body, options)
            .map(this.extractData)
            .catch(this.handleError);
    };
    CanvasService.prototype.testUrl = function (url) {
        var body = JSON.stringify({ url: url });
        var headers = new http_2.Headers({ 'Content-Type': 'application/json' });
        var options = new http_2.RequestOptions({ headers: headers });
        return this.http.post(this.Url + '/test-url', body, options)
            .map(this.extractData)
            .catch(this.handleError);
    };
    CanvasService = __decorate([
        core_1.Injectable(), 
        __metadata('design:paramtypes', [http_1.Http])
    ], CanvasService);
    return CanvasService;
}());
exports.CanvasService = CanvasService;
//# sourceMappingURL=planner.service.js.map