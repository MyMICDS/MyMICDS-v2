var schedule = require(__dirname + '/../libs/schedule.js');

module.exports = function(app) {
    app.post('/add-class', function(req, res) {
        var user = req.session.user;
        var scheduleClass =
        {
            name   : req.body.name,
            teacher: req.body.teacher,
            block  : req.body.block,
            color  : req.body.color,
            type   : req.body.type,
            displayPlanner: req.body.displayPlanner ? true : false,
        }
        schedule.addClass(user, scheduleClass, function(id) {
            if(typeof id !== 'string') {
                res.json({success: true, classId: id, message: 'Success!'});
            } else {
                res.json({success: false, classId: null, message: id})
            }
        });
    });
    
    app.post('/delete-class', function(req, res) {
        
    });
    
    app.post('/configure-schedule', function(req, res) {
        
    });
    
    app.post('/delete-schedule', function(req, res) {
        
    });
};