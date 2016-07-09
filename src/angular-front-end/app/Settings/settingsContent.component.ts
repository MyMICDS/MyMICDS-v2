import {Component} from '@angular/core';
import {DomData} from '../mockdata.service'
import {PortalService, CanvasService} from '../services/planner.service';
import {UserService} from '../services/user.service';
import {NgFor, NgIf, NgForm} from '@angular/common';

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
    user: {
        'first-name': string,
        'last-name': string,
        'grad-year': number
    }
    = {
        'first-name': '',
        'last-name': '',
        'grad-year': null
    }
    gradeRange = []

    errMsg: string;

    getUserInfo() {
        this.userService.getInfo().subscribe(
            userInfo => {
                if (userInfo.error) {
                    this.errMsg = userInfo.error + ' (this is not a connection problem)';
                }
                else {
                    this.username = userInfo.user.user;
                    this.user['first-name'] = userInfo.user.firstName;
                    this.user['last-name'] = userInfo.user.lastName;
                    this.user['grad-year'] = userInfo.user.gradYear;
                    console.dir(userInfo)
                }
            },
            error => {
                this.errMsg = 'Connection Error: ' + error;
            }
        );
    }

    ngOnInit() {
        this.getUserInfo();

        this.userService.getGradeRange().subscribe(
            gradeRange => {
                this.gradeRange = gradeRange.gradYears;
            },
            error => {
                console.log(error)
            }
        )

    }

    onSubmitName() {
        let postUser = {
            'first-name': this.user['first-name'],
            'last-name': this.user['last-name'],
            'grad-year': this.user['grad-year'].toString()
        }
        console.dir(postUser);
        this.userService.changeInfo(postUser).subscribe(
            res => {res.error? this.errMsg = res.error : console.log('changed submitted')},
            error => this.errMsg = error,
            () => this.getUserInfo()
        );
    }
}