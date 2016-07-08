import {Component} from '@angular/core';
import {MyProgress} from './progress/progress.component'
import {DomData} from '../mockdata.service'
import {PortalService} from '../services/planner.service'
import {NgFor, NgIf} from '@angular/common'

var _navService = new DomData();
var styleUrl = _navService.getMain().selectedStyle.StyleUrl;
var templateUrl = _navService.getMain().selectedStyle.TemplateUrl;
var i;

@Component ({
    selector: 'app-content',
    templateUrl: templateUrl,
    styleUrls: [styleUrl],
    directives: [MyProgress, NgFor, NgIf],
    providers: [PortalService]
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
        var week = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return {
            year: d.getFullYear(),
            month: d.getMonth(),
            day: d.getDate(),
            hours: d.getHours(),
            minutes: d.getMinutes(),
            seconds: d.getSeconds(),
            dayInWeek: week[d.getDay()],
            dateString: d.toString()
        }
    };

    public percentage: number;
    public current_class: {
        class: string;
        percentage: number};
    public rotation_day: number;
    private end_time: number = 15.25;
    private start_time: number;
    public school_avaliable: boolean;
    public schedule: {
        day: number;
        classes: {
            start: string;
            end: string;
            name: string;
        }[];
        allDay: string[];
    };
    public class_times:{start:string, end:string}[]
    public scheduleReady:boolean;
    public errorMsg;
    constructor(private portalService: PortalService) {
        this.percentage = 0;
        this.date = this.getDate();
        this.date.dayInWeek == 'Wednesday' ? this.start_time = 9 : this.start_time = 8;
        this.date.dayInWeek=='Saturday'||this.date.dayInWeek=='Sunday' ? this.school_avaliable=false : this.school_avaliable=true;
        this.schedule = {day:0,classes:[],allDay:[]};
        this.current_class = {class: '',percentage:0};
        this.class_times = [{start:'',end:''}];
        this.rotation_day = 0;
    };

    getSchedule(date) {
        this.portalService.getSchedule(date).subscribe(
            scheduleData => {
                if (scheduleData.error) {
                    this.errorMsg = scheduleData.error;
                    console.log('Error getting schedule: '+this.errorMsg);
                } else {
                    this.schedule = scheduleData.schedule;
                    this.rotation_day = scheduleData.schedule.day;
                    this.scheduleReady = true;
                } 
            },
            error => {
                this.errorMsg = <any>error;
            }
        );
    }

    getHrMin(date: Date) {
        let hrs:string, min:string;
        date.getHours() == 0 ? hrs = "00" : hrs = date.getHours().toString();
        date.getMinutes() ==0 ? min = "00" : min = date.getMinutes().toString();
        return hrs + ':' + min;
    }

    calcPercentage() {
        let duration = (this.end_time - this.start_time) * 3600;
        this.date = this.getDate();
        if (this.school_avaliable) {
            let elapsed_time = this.date.hours * 3600 + this.date.minutes * 60 + this.date.seconds - this.start_time * 3600;
            let percentage = Math.round((elapsed_time / duration) * 10000) / 100;
            if (percentage>=100 || percentage<0) {
                this.school_avaliable=false;
                let date = {year: this.getDate().year, month: this.getDate().month, day: this.getDate().day+1};
                this.getSchedule(date);
                clearInterval(i);
            } else {
                this.school_avaliable=true;
                this.percentage = percentage;
                let classes = this.schedule.classes
                for (let i=0;i<classes.length;i++){
                    let cStart = new Date(classes[i].start);
                    let cEnd = new Date(classes[i].end);
                    this.class_times[i] = {start: this.getHrMin(cStart), end:this.getHrMin(cEnd)};
                    let csElapsed = cStart.getHours()*3600 + cStart.getMinutes()*60 + cStart.getSeconds() - this.start_time*3600;
                    let ceElapsed = cEnd.getHours()*3600 + cEnd.getMinutes()*60 + cEnd.getSeconds() - this.start_time*3600;
                    if (csElapsed<elapsed_time && ceElapsed>elapsed_time) {
                        this.current_class.class = classes[i].name;
                        this.current_class.percentage = Math.round((elapsed_time-csElapsed)/(ceElapsed-csElapsed)*10000)/100
                    }
                }
            };
        }
    }

    ngOnInit() { 
        let date = {year: this.getDate().year, month: this.getDate().month+1, day: this.getDate().day}
        this.getSchedule(date);
        i = setInterval(()=>{
            this.calcPercentage();
        }, 100) 
    }
    
    ngOnDestroy() { clearInterval(i) }
}
