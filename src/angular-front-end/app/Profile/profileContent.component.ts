import {Component} from '@angular/core';
import {UserService} from '../services/user.service'
import {DomData} from '../mockdata.service'

var _navService = new DomData();
var styleUrl = _navService.getProfile().selectedStyle.StyleUrl;
var templateUrl = _navService.getProfile().selectedStyle.TemplateUrl;

@Component ({
    selector: 'app-content',
    templateUrl: templateUrl,
    styleUrls: [styleUrl],
    providers: [UserService]
})
 
export class profileContent{
    user: {
    };
    constructor (private userService: UserService) {
        this.user = this.userService.getInfo()
    };
}