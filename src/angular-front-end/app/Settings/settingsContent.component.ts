import {Component} from '@angular/core';
import {DomData} from '../mockdata.service'
import {PortalService, CanvasService} from '../services/planner.service';
import {UserService} from '../services/user.service';
import {NgFor} from '@angular/common';

var themeService = new DomData();
var styleUrl = themeService.getSettings().selectedStyle.StyleUrl;
var templateUrl = themeService.getSettings().selectedStyle.TemplateUrl;

@Component ({
    selector: 'app-content',
    templateUrl: templateUrl,
    styleUrls: [styleUrl],
    providers: [PortalService, CanvasService, UserService],
    directives: [NgFor]
})

export class settingsContent{
    constructor (private protalService: PortalService, private canvasService: CanvasService, private userService: UserService) {}

    username = '';
    firstName = '';
    lastName = '';
    gradYear = '';
    gradeRange = []

    ngOnInit() {
        this.userService.getInfo().subscribe(
            userInfo => {
                if (userInfo.error) {console.log(userInfo.error)}
                else {
                    this.username = userInfo.user.user;
                    this.firstName = userInfo.user.firstName;
                    this.lastName = userInfo.user.lastName;
                    this.gradYear = userInfo.user.gradYear;
                }
            },
            error => {
                console.log(error);
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