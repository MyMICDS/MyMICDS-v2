"use strict";
var router_1 = require('@angular/router');
var mainContent_component_1 = require('./Home/mainContent.component');
var lunchContent_component_1 = require('./Lunch/lunchContent.component');
var plannerContent_component_1 = require('./Planner/plannerContent.component');
var profileContent_component_1 = require('./Profile/profileContent.component');
var settingsContent_component_1 = require('./Settings/settingsContent.component');
var accountContent_component_1 = require('./Account/accountContent.component');
exports.routes = [
    { path: '', component: mainContent_component_1.mainContent },
    { path: 'Home', component: mainContent_component_1.mainContent },
    { path: 'Lunch', component: lunchContent_component_1.lunchContent },
    { path: 'Planner', component: plannerContent_component_1.plannerContent },
    { path: 'Profile', component: profileContent_component_1.profileContent },
    { path: 'Settings', component: settingsContent_component_1.settingsContent },
    { path: 'Account', component: accountContent_component_1.accountContent }
];
exports.APP_ROUTER_PROVIDERS = [
    router_1.provideRouter(exports.routes)
];
//# sourceMappingURL=app.routes.js.map