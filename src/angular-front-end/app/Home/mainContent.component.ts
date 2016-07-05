import {Component} from '@angular/core';
import {MyProgress} from './progress/progress.component'
import {DomData} from '../mockdata.service'
//import {NgIf} from '@angular/common'

var _navService = new DomData();
var styleUrl = _navService.getMain().selectedStyle.StyleUrl;
var templateUrl = _navService.getMain().selectedStyle.TemplateUrl;
var i;

@Component ({
    selector: 'app-content',
    templateUrl: templateUrl,
    styleUrls: [styleUrl],
    directives: [MyProgress]
})

export class mainContent{
    public date: { 
        year: number,
        month: number,
        day: number,
        hours: number,
        minutes: number,
        seconds: number,
        dayInWeek: string,
        dateString: string};

    public getDate() {//get local date
        var d = new Date();
        var week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return {
            year: d.getFullYear(),
            month: d.getMonth(),
            day: d.getDate(),
            hours: d.getHours(),
            minutes: d.getMinutes(),
            seconds: d.getSeconds(),
            dayInWeek: week[d.getDay()],
            dateString: d.toString()
        };
    };

    ngOnInit() { 
        let duration = (this.end_time - this.start_time) * 3600;
        i = setInterval(()=>{
            this.date = this.getDate();
            if (this.school_avaliable) {
                let elapsed_time = this.date.hours * 3600 + this.date.minutes * 60 + this.date.seconds - this.start_time * 3600;
                let percentage = Math.round((elapsed_time / duration) * 10000) / 100;
                if (percentage>=100) {this.school_avaliable=false} 
                else {
                    this.school_avaliable=true;
                    this.percentage = percentage;
                    
                };
            }
        }, 100) 
    }
    
    ngOnDestroy() { clearInterval(i) }

    public percentage: number;
    public current_class: {
        class: string;
        class_percentage: number};
    public rotation_day: number;
    private end_time: number = 15.25;
    private start_time: number;
    public school_avaliable: boolean;
    private schedule;
    public constructor(private _DomService: DomData) {
        this.percentage = 0;
        this.current_class = {class: 'E', class_percentage: 50};//figure out a way to dsiplay the percentage
        this.rotation_day = _DomService.getProgress().classData.day;
        this.date = this.getDate();
        this.date.dayInWeek == 'Wednesday' ? this.start_time = 9 : this.start_time = 8;
        this.date.dayInWeek=='Saturday'||this.date.dayInWeek=='Sunday' ? this.school_avaliable=false : this.school_avaliable=true;
        this.schedule = _DomService.getProgress().classData.schedule;
    };
}
