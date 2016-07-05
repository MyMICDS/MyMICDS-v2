import {Component} from '@angular/core';
import {NgForm} from '@angular/common'
import {DomData} from '../mockdata.service'

var _navService = new DomData();
var styleUrl = _navService.getAccount().selectedStyle.StyleUrl;
var templateUrl = _navService.getAccount().selectedStyle.TemplateUrl;

@Component ({
    selector: 'app-content',
    templateUrl: templateUrl,
    styleUrls: [styleUrl],
    directives: []
})

export class accountContent{
    form = {//dummy data
        email:'',
        password1: '',
        password2: '',
    };
    submitted = false;
    submitSuccess = false;
    onSubmit() {
        const p = new Promise(
            (resolve, reject) => {
                this.submitted = true; 
                setTimeout(()=>{resolve()}, 6000)
            }
        );
        p.then(()=>this.submitSuccess = true)
        .catch((e)=>console.log(e))
    }
}
