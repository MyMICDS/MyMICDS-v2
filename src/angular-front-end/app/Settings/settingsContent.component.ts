import {Component} from '@angular/core';
import {DomData} from '../mockdata.service'
import {PortalService, CanvasService} from '../services/planner.service';
import {UserService} from '../services/user.service';
import {NgFor, NgIf} from '@angular/common';
import {ROUTER_DIRECTIVES} from '@angular/router'

var themeService = new DomData();
var styleUrl = themeService.getSettings().selectedStyle.StyleUrl;
var templateUrl = themeService.getSettings().selectedStyle.TemplateUrl;

@Component ({
    selector: 'app-content',
    templateUrl: templateUrl,
    styleUrls: [styleUrl],
    providers: [PortalService, CanvasService, UserService],
    directives: [NgFor, ROUTER_DIRECTIVES, NgIf]
})

export class settingsContent{
    constructor (private protalService: PortalService, private canvasService: CanvasService, private userService: UserService) {}

    username = '';
    firstName = '';
    lastName = '';
    gradYear = '';
    gradeRange = []

    errMsg: string;
    isLoggedIn = false;

    ngOnInit() {
        this.userService.getInfo().subscribe(
            userInfo => {
                if (userInfo.error) {
                    this.errMsg = userInfo.error + ' (this is not a connection problem)';
                }
                else {
                    this.isLoggedIn = true;
                    this.username = userInfo.user.user;
                    this.firstName = userInfo.user.firstName;
                    this.lastName = userInfo.user.lastName;
                    this.gradYear = userInfo.user.gradYear;
                }
            },
            error => {
                this.errMsg = 'Connection Error: ' + error;
            }
        );
        this.userService.getGradeRange().subscribe(
            gradeRange => {
                this.gradeRange = gradeRange.gradYears;
            },
            error => {
                console.log(error)
            }
        )

        
    }
}