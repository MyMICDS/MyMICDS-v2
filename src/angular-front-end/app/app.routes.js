"use strict";
var router_1 = require('@angular/router');
var mainContent_component_1 = require('./Home/mainContent.component');
var lunchContent_component_1 = require('./Lunch/lunchContent.component');
var plannerContent_component_1 = require('./Planner/plannerContent.component');
var settingsContent_component_1 = require('./Settings/settingsContent.component');
var protected_component_1 = require('./Protected/protected.component');
var auth_guard_1 = require('./auth.guard');
var auth_service_1 = require('./services/auth.service');
exports.routes = [
    { path: '', redirectTo: 'home', pathMatch: 'full' },
    { path: 'home', component: mainContent_component_1.mainContent },
    { path: 'lunch', component: lunchContent_component_1.lunchContent },
    { path: 'planner', component: plannerContent_component_1.plannerContent },
    { path: 'settings', component: settingsContent_component_1.settingsContent, canActivate: [auth_guard_1.AuthGuard] },
    { path: 'protected', component: protected_component_1.ProtectedComponent }
];
exports.APP_ROUTER_PROVIDERS = [
    router_1.provideRouter(exports.routes),
    auth_service_1.AuthService, auth_guard_1.AuthGuard
];
//# sourceMappingURL=app.routes.js.map