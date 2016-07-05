import {styleList} from './styleSettings'
import {Injectable} from '@angular/core';

@Injectable()
export class DomData {
    public getStyleName() {
        return 'default'
    }

    public getNav() {
        var styleName = this.getStyleName();
        var selectedStyle = styleList[styleName].navbar;
        return {
            navTitles: ["Home", "Lunch", "Planner", "Settings", "Profile"], //this is supposed to get data from somewhere
            selectedStyle
        }
    }
    public getPlanner() {
        var styleName = this.getStyleName();
        var selectedStyle = styleList[styleName].planner;

        return {selectedStyle,
            

        }
    }

    public getweather() {}
    public getProgress() {
        var styleName = this.getStyleName();
        var selectedStyle = styleList[styleName].progress;

        var classData = {
            day: 1,
            schedule: {
                A: "Math",
                B: "English",
                C: "Science",
                D: "History",
                E: "World Language",
                F: "Choir",
                G: "Free"
            }
        }
        return {classData, selectedStyle}
    }    
    //Background services
    public getBg() {
        var bgName = this.getStyleName();
        var selectedBg = styleList[bgName].background;
            return selectedBg
    }

    public getLunch(date:{year: number, month: number, day: number}) {
        //Five categories: Main Dish, Action station, Soup, Salad Bar and Dessert.
        var styleName = this.getStyleName();
        var selectedStyle = styleList[styleName].lunch;
        return {
            selectedStyle,
            date: date,
            lunchState: true,
            lunchSpecial: 'Lunch', //Traveling flavors
            lunch: {
                'Main Dish': ['BBQ Beef Sandwiches', 'Veggie burgers', 'Crispy Patatoes', 'steamed Sugar Snap Peas'],
                'Action Station': ['Santa Fe Chiken & rice', 'Panini'],
                'Soup': ['Corn Chowder'],
                'Salad Bar': ['Chefs Salad'],
                'Dessert': ['Jello with whipped topping']
            },
            stations: ['Main Dish', 'Action Station', 'Soup', 'Salad Bar', 'Dessert'],
            imgLinks: ['../assets/a29f20e0gw1f1js9envmbj218c1uo7wh.jpg','../assets/a29f20e0gw1f1js9j1dpej20ov0xcb26.jpg','../assets/a29f20e0jw1f1dxiv9p1oj20xc0qfx3t.jpg','../assets/a29f20e0jw1f1dxj7b2tjj20ow0xcngo.jpg','../assets/a29f20e0jw1f1dxjf2v4zj20m80ftqes.jpg']
        }
            
    }

    public getMain() {
        var styleName = this.getStyleName();
        var selectedStyle = styleList[styleName].main;


        return {selectedStyle}
    }

    public getAccount() {
        var styleName = this.getStyleName();
        var selectedStyle = styleList[styleName].account;
        return {selectedStyle}
    }

    public getProfile() {
        var styleName = this.getStyleName();
        var selectedStyle = styleList[styleName].profile;
        return {selectedStyle}
    }
}
