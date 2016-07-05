import {Component} from '@angular/core';
import {DomData} from './mockdata.service';

var _bgService = new DomData();
try {
    var templateUrl:string = _bgService.getBg().HTMLUrl;
    var styleUrl:string = _bgService.getBg().StyleUrl;
} catch (e) {
    console.log(e);
}

if (!templateUrl || !styleUrl) {
    templateUrl = '../Backgrounds/BgFail/BgFail.html';
    styleUrl = ''
}

@Component({
    selector: 'my-bg',
    providers: [DomData],
    templateUrl: templateUrl,
    styleUrls: [styleUrl]
})

export class BgComponent{
    public constructor(private _BgService:DomData) {
        try {
            System.import(_BgService.getBg().LibUrl);
            System.import(_BgService.getBg().JSUrl);
        } catch(e) {
            console.log(e)
        }
     }
}