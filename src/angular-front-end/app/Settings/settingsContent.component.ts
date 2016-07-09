import {Component} from '@angular/core';
import {DomData} from '../mockdata.service'
import {PortalService, CanvasService} from '../services/planner.service';
import {UserService} from '../services/user.service';
import {NgFor, NgIf} from '@angular/common';

var themeService = new DomData();
var styleUrl = themeService.getSettings().selectedStyle.StyleUrl;
var templateUrl = themeService.getSettings().selectedStyle.TemplateUrl;

@Component ({
    selector: 'app-content',
    templateUrl: templateUrl,
    styleUrls: [styleUrl],
    providers: [PortalService, CanvasService, UserService],
    directives: [NgFor, NgIf]
})

export class settingsContent{
    constructor (private protalService: PortalService, private canvasService: CanvasService, private userService: UserService) {}

    username = '';
    user= {
        firstName: '',
        lastName: '',
        gradYear: ''
    }
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
                    this.user.firstName = userInfo.user.firstName;
                    this.user.lastName = userInfo.user.lastName;
                    this.user.gradYear = userInfo.user.gradYear;
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