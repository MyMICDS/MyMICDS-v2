import {Injectable} from '@angular/core';
import '../rxjs-operators';
import {Http, Response} from '@angular/http';
import {Observable} from 'rxjs/Observable';
import { Headers, RequestOptions } from '@angular/http';
import {UserService} from './user.service'

@Injectable()
export class AuthService {

    constructor (private http: Http, private userService: UserService) {}

    private extractData(res: Response
    ) {
        let body = res.json();
        return body || { };
    }
    private handleError (error: any) {
        let errMsg = (error.message) ? error.message :
            error.status ? `${error.status} - ${error.statusText}` : error;
        console.error(errMsg); // log to console instead
        return Observable.throw(errMsg);
    }

    public testLogin():boolean { //this might not be the best solution to test a user's login state
        let state: boolean;
        this.userService.getInfo().subscribe(
            Info => Info.error ? state = false : state = true,
            error => {state = false; console.error("error getting user info: ", error)}
        )
        return state;
    }

    private authUrl = 'http://localhost:1420/auth'
    public logIn(loginModel:{user:string,password:string,remember:any}):
    Observable<{
        error: string;
        success: boolean;
        cookie: {
            selector:string,
            token:string,
            expires:string
            }}> {
        let body = JSON.stringify(loginModel);
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });
        
        return this.http.post(this.authUrl+'/login', body, options)
                        .map(this.extractData)
                        .catch(this.handleError);
    }

    public logOut():Observable<any> {
        let body = null;
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });

        return this.http.post(this.authUrl+'/logout', body, options)
                        .map(this.extractData)
                        .catch(this.handleError);
    }

    public register(info: {
        user: string;
        password: string;
        firstName: string;
        lastName: string;
        'grad-year': any;
        teacher: any;
    }):Observable<{error:any}>{
        let body = JSON.stringify(info);
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });
        
        return this.http.post(this.authUrl+'/register', body, options)
                        .map(this.extractData)
                        .catch(this.handleError);
    }
}