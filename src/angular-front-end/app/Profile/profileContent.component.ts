import {Component} from '@angular/core';
import {AuthService} from '../mockauth.service'
import {DomData} from '../mockdata.service'

var _navService = new DomData();
var styleUrl = _navService.getProfile().selectedStyle.StyleUrl;
var templateUrl = _navService.getProfile().selectedStyle.TemplateUrl;

@Component ({
    selector: 'app-content',
    templateUrl: templateUrl,
    styleUrls: [styleUrl],
    providers: [AuthService]
})
 
export class profileContent{
    user: {
        firstName: string,
        lastName: string,
        email: string,
        gradYear: number
    };
    constructor (private userService: AuthService) {
        this.user = this.userService.getUser()
    };
}