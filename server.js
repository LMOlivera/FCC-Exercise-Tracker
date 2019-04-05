const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const cors = require('cors');

const mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.connect(process.env.MLAB_URI, {useNewUrlParser: true});

var userSchema = new Schema({
  username: {type: String, required: true},
  log: [{
    _id: false,
    description: {type: String},
    duration: {type: String},
    date: {type: String}
  }]
});
var user = mongoose.model('user', userSchema);
var createAndSaveUser = function(userObj, done) {
  var us = new user({ username: userObj.username });
    user.create(us, function (err) {
      if (err){
        done(err, "Error");
      } else {
        done(null, "Saved")
      }
    });    
};


app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())




app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// 1- Save username and get a JSON with its data
app.post('/api/exercise/new-user', (req, res)=>{
  createAndSaveUser({username: req.body.username}, (err, data)=>{
    if (data=="Saved"){
      user.find({username: req.body.username}, (err,results)=>{
        if(results.length>0){
          res.json({username: results[0].username, _id: results[0]._id});
        }else{
          res.json({error: "The user couldn't be saved in the database."});
        }
      }); 
    }else{
      res.json({error: "The user couldn't be saved in the database."});
    }
  });
});

// 2- Get all users in database.
app.get('/api/exercise/users', (req, res)=>{
  user.find({}, (err,results)=>{
    var users = [];
    users.push(...results.map(item=> {return {username: item.username, _id: item._id}}));
    res.json(users);
  }); 
});

// 3- Add an exercise
app.post('/api/exercise/add', (req, res)=>{
  var exercise = {description: req.body.description,
                  duration: req.body.duration,
                  date: (req.body.date).split('T')[0]};
  if (exercise.date == ""){
    var d = new Date().toISOString().split('T')[0];
    exercise.date = d;
  }
  user.findById(req.body.userId, function (err, doc) {
    if (err || doc == null){
      res.json({error: "User ID does not exist in the database."});
    }else{
      doc.log.push(exercise);
      doc.save((err)=>{
        if (err){
          res.json({error: "Exercise could not be saved on the database."})
        }else{
          res.json(doc);
        }
      });        
    }
  }); 
});

// 4 & 5- Retrieve user's log, needs a LOT of refactoring
app.get('/api/exercise/log',(req, res)=>{
  var userId = req.query.userId;
  var from = req.query.from;
  var to = req.query.to;
  var limit = req.query.limit;
  
  
  user.findById(req.query.userId, function (err, doc) {
    if (err || doc == null){
      res.json({error: "User ID does not exist in the database."});
    }else{
      if (to == undefined && from == undefined){
        if (limit>0 && limit != undefined){
          //Only userId and Limit
          var user = {_id: doc._id,
                     username: doc.username,
                     log: []
                     };
          for(var i = 0; i<limit; i++){
            user.log.push(doc.log[i]);
          }
          
          res.json(user);  
        }else if (limit == 0){
          var user = {_id: doc._id,
                     username: doc.username}
          res.json(user);          
        }else{
          res.json(doc);
        }
      }else{
        if (from == undefined && to != undefined){
          //To provided but not From
          res.json({error: "You have to input a 'from' date to filter data."});          
        }else if (from != undefined && to == undefined){
          if (limit>0 && limit != undefined){
            var user = {_id: doc._id,
                       username: doc.username,
                       log: []
                       };
            for(var i = 0; i<limit; i++){
              if(doc.log[i].date >= from){
                user.log.push(doc.log[i]);
              }              
            }
          res.json(user); 
          }
          else{
            var user = {_id: doc._id,
                       username: doc.username,
                       log: []
                       };
            for(var i = 0; i<doc.log.length; i++){
              if(doc.log[i].date >= from){
                user.log.push(doc.log[i]);
              }              
            }
            res.json(user);
          } 
        }else if (from != undefined && to != undefined){
          if (limit>0 && limit != undefined){
            var user = {_id: doc._id,
                       username: doc.username,
                       log: []
                       };
            for(var i = 0; i<limit; i++){
              if((doc.log[i].date >= from) && (doc.log[i].date <= to)){
                user.log.push(doc.log[i]);
              }              
            }
            res.json(user);
          }else{
            var user = {_id: doc._id,
                       username: doc.username,
                       log: []
                       };
            for(var i = 0; i<doc.log.length; i++){
              if((doc.log[i].date >= from) && (doc.log[i].date <= to)){
                user.log.push(doc.log[i]);
              }              
            }
            res.json(user);
          }                
        }
      }
    }
    
    
    });
});


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
