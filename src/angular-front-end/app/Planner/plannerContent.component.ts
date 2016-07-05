import {Component} from '@angular/core';
import {DomData} from '../mockdata.service'

var _navService = new DomData();
var styleUrl = _navService.getPlanner().selectedStyle.StyleUrl;
var templateUrl = _navService.getPlanner().selectedStyle.TemplateUrl;


@Component ({
    selector: 'app-content',
    templateUrl: templateUrl,
    styleUrls: [styleUrl]
})

export class plannerContent{}