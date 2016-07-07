import {Component} from '@angular/core';
import {NgForm} from '@angular/common';
import {DomData} from '../mockdata.service';
import {AuthService} from '../services/auth.service'

var _navService = new DomData();
var styleUrl = _navService.getAccount().selectedStyle.StyleUrl;
var templateUrl = _navService.getAccount().selectedStyle.TemplateUrl;

@Component ({
    selector: 'app-content',
    templateUrl: templateUrl,
    styleUrls: [styleUrl],
    directives: [],
    providers: [AuthService]
})

export class accountContent{
    constructor(private authService: AuthService) {}
    repeatPass = '';
    form = {
        user:'',
        password: '',
        firstName: '',
        lastName: '',
        'grad-year':'',
        teacher:''
    };
    submitted = false;
    submitSuccess = false;
    errMsg = '';
    onSubmit() {
        this.submitted = true;
        this.authService.register(this.form).subscribe(
            res => {
                if (res.error) {
                    this.submitSuccess = false;
                    this.submitted = false;
                    this.errMsg = res.error;
                } else {
                    this.submitSuccess = true;
                    this.submitted = true;
                }
            },
            error => {
                this.errMsg = error;
                this.submitSuccess = false;
                this.submitted = false;
            }
        )
    }

    changeEmail() {
        this.submitted = false;
        this.submitSuccess = false;
    }
}
