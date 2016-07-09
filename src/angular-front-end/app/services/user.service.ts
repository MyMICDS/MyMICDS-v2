import {Injectable} from '@angular/core';
import '../rxjs-operators';
import {Http, Response} from '@angular/http';
import {Observable} from 'rxjs/Observable';
import { Headers, RequestOptions } from '@angular/http';

@Injectable()
export class UserService {
    constructor (private http: Http) {}

    private extractData(res: Response) {
        let body = res.json();
        return body || { };
    }
    private handleError (error: any) {
        let errMsg = (error.message) ? error.message :
            error.status ? `${error.status} - ${error.statusText}` : error;
        console.error(errMsg); // log to console instead
        return Observable.throw(errMsg);
    }

    private userUrl = 'http://localhost:1420/user'

    public getInfo():Observable<{
        error:any,
        user:{
            canvasURL:string
            firstName:string;
            gradYear:number;
            grade:number;
            lastName:string;
            password:string;
            portalURL:string;
            user:string;
        }
    }> {
        let body = null;
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });
        
        return this.http.post(this.userUrl+'/get-info', body, options)
                        .map(this.extractData)
                        .catch(this.handleError);
    }

    public getGradeRange():Observable<{gradYears:number[]}> {
        let body = null;
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });
        
        return this.http.post(this.userUrl+'/grade-range', body, options)
                        .map(this.extractData)
                        .catch(this.handleError);
    }

    public changeInfo(user: {
        'first-name': string;
        'last-name': string;
        'grad-year': string;
    }):Observable<{error:any}> {
        let body = JSON.stringify(user);
        let headers = new Headers({ 'Content-Type': 'application/json' });
        let options = new RequestOptions({ headers: headers });
        
        return this.http.post(this.userUrl+'/grade-range', body, options)
                        .map(this.extractData)
                        .catch(this.handleError);
    }
}