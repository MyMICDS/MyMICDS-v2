import {Component} from '@angular/core';
import {DomData} from '../mockdata.service';
import {DomSanitizationService} from '@angular/platform-browser'
import {NgClass, NgFor, NgIf} from '@angular/common'

var d = new Date();
var date = {
        year: d.getFullYear(),
        month: d.getMonth(),
        day: d.getDate()
    };

var _navService = new DomData();
var styleUrl = _navService.getLunch(date).selectedStyle.StyleUrl;
var templateUrl = _navService.getLunch(date).selectedStyle.TemplateUrl;

@Component ({
    selector: 'app-content',
    templateUrl: templateUrl,
    styleUrls: [styleUrl],
    directives: [NgClass, NgFor, NgIf],
    providers: [DomData]
})

export class lunchContent{
    public date = date;
    public lunchSpecial;
    public lunchState;
    public lunch;
    public stations;
    public imgLinks;
    constructor (private dataService:DomData, private DomSanitizationService: DomSanitizationService) {
        var lunchObj = dataService.getLunch(this.date);
        this.lunchSpecial = lunchObj.lunchSpecial;
        this.lunchState = lunchObj.lunchState;
        this.lunch = lunchObj.lunch;
        this.stations = lunchObj.stations;
        this.imgLinks = lunchObj.imgLinks;
        //DomSanitizationService.bypassSecurityTrustStyle("transform 0.4s cubic-bezier(0.445, 0.05, 0.55, 0.95)");
    };
    // private bubbleClick:boolean[] = [false, false, false, false, false];
    // private moveDirection = [0, 0, 0, 0, 0];
    // public onClickBubble(x) {
    //     for (let i=0; i<=4; i++) {this.bubbleClick[i] = false};
    //     this.bubbleClick[x] = !(this.bubbleClick[x]);
    //     for (let i=0; i<=4; i++) {this.moveDirection[i] = 0};
    //     this.moveDirection[x] = -1;
    //     for (let i=x+1; i<=4; i++) {this.moveDirection[i] = 1};
    //     console.log(this.moveDirection)
    // }
    // public setStyles(x) {
    // let styles = {
    //     animation: this.bubbleClick[x] ? 'magnify 0.4s ease 0s 1 normal forwards running' : 'magnify 0.4s ease 0s 1 reverse backwards running',
    //     //transform: this.moveDirection[x] == -1 ? 'translate(0)' : this.moveDirection[x] == 1 ? 'translate(400px)' : 'translate(-400px)',
    //     }
    // return styles;
    // }
}