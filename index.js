'use strict';

const Hapi = require('hapi');
const Good = require('good');
const Path = require('path');
const ObjectId = require('mongodb').ObjectID;
const Handlebars = require('handlebars');
const requestIp = require('request-ip');
var fs = require('fs');
var util = require('util');
var dir = __dirname + '/log/';
var nooffile = 0;
// fs.readdir(dir, (err, files) => {
  // console.log(files.length);
  // nooffile = files.length;
// var log_file = fs.createWriteStream(__dirname + '/log/debug.log', {flags : 'w'});
// var log_stdout = process.stdout;

// });

var logFile = function(d) { //
  // console.log(__dirname);
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};
// const Boom = require('boom');

// const Mongo = require('hapi-mongodb');
const server = new Hapi.Server();
server.connection({ port: 80, host: '0.0.0.0' });
// server.listen(80, 'current_local_ip');

const dbOpts = {
    url: 'mongodb://localhost:27017/test',
    settings: {
        poolSize: 10
    },
    decorate: true
};

server.state('session', {
    ttl: null,
    isSecure: false,
    isHttpOnly: true,
    encoding: 'base64json',
    clearInvalid: false, // remove invalid cookies
    strictHeader: true // don't allow violations of RFC 6265
});
server.register(require('vision'), (err) => {

    //Hoek.assert(!err, err);

    server.views({
        engines: {
            html: require('handlebars')
        },
        relativeTo: __dirname,
        path: 'public',
        layout: true,
        layoutPath: Path.join(__dirname, 'public/layout'),
        helpersPath: Path.join(__dirname, 'public/helpers'),
        // layoutPath: './public/layout',
        //helpersPath: './public/materialize/js'
    });
});



server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
        reply.file('./public/index5.html');
    }
});
server.register([{
    register: require('inert'),
    options: {}
}, {
    register: require('hapi-mongodb'),
    options: dbOpts
}], (err) => {

    if (err) {
        throw err;
    }

    server.route({
        method: 'GET',
        path: '/login',
        handler: function (request, reply) {
            const clientIp = requestIp.getClientIp(request);
            // var datetime = new Date();
            // logFile("request from "+clientIp+ " at "+datetime); 
            // reply("iuhjnljk");
            // console.log(request.query.message);
            if(!request.state.session) reply.view('login',{message:request.query.message},{ layout: 'loginlay' });
            else if(request.state.session.isloggedin==true) {
                if(request.state.session.isadmin==true)
                    reply.redirect('/admindash?message='+request.query.message);
                else
                reply().redirect('/accept');

            }
            else reply.view('login',{message:request.query.message},{ layout: 'loginlay' });
            
            // if(!request.state.session) reply.file('./public/login.html');
            // else if(request.state.session.isloggedin==true) reply().redirect('/accept');
            // else reply.file('./public/login.html');
        }
    });

    server.route({
        method: 'GET',
        path: '/accept',
        handler: function(request,reply){
            console.log(request.state.session);
            if(!request.state.session) reply.view('login',{message:"Log in first"},{layout:"loginlay"});
//reply("log in first").redirect("/login");
            else {
                const db = request.mongo.db;
                if(request.query.p){
                    console.log(request.query.p);
                }
                db.collection('users').findOne({'username':request.state.session.user},function (err,result){
                    
                reply.view('dashboard',{name : request.state.session.user,message:request.query.message});
                });

            }
        }
    });
    server.route({
        method: 'GET',
        path: '/home',
        handler: function(request,reply){
            console.log(request.state.session);
            if(!request.state.session) reply.view('login',{message:"Log in first"},{layout:"loginlay"});
//reply("log in first").redirect("/login");
            else {
                if(request.state.session.admin) reply('admin');    
                else reply("not admin");

            }
        }
    });
        server.route({
        method: 'POST',
        path: '/register',
        handler: function (request, reply) {
            var name = request.payload.fname +" "+ request.payload.lname;
            var phone = request.payload.phone;
            var regno = request.payload.regno;
            var year = request.payload.year;
            var semester= request.payload.semester;
            var username = request.payload.username;
            var password = request.payload.password;
                const db = request.mongo.db;
            var exist = 0;
            
            if(!(name&&phone&&regno&&username&&password&&semester&&year)){
                if(!name) console.log("name not present");
                if(!phone) console.log("phone not present");
                if(!username) console.log("username not present");
                if(!password) console.log("password not present");
                if(!semester) console.log("semester not present");
                if(!year) console.log("year not present");
                if(!regno) console.log("regno not present");
                
                reply.view('login',{message:"incomplete"},{layout:"loginlay"});
            }
            else if(username){
                db.collection('users').findOne({'username':username}, function (err, result) {
                if(result) exist = 1; 
                

            if(exist==1) 
                reply.view('login',{message:"exists"},{layout:"loginlay"});

            else{
            db.collection('users').insert({regno:regno,phone:phone,year:year,semester:semester,name:name,username:username,password:password,approved:'0',admin:'0'});
            reply.view('login',{message:"success"},{layout:"loginlay"});

            }    


            });

 
            }

        }
    });
    server.route({
        method: 'POST',
        path :'/authorise',
        handler: function(request,reply){
            const db = request.mongo.db;
            var regno = request.payload.regno;

            if(!request.state.session){
                reply.redirect("/login?message=you need to log in to your acount in order to authorise");
            }
            else{

                console.log('reached');
                db.collection('users').findOne({'username':request.state.session.user},function (err,result){
                    if(result.admin=='0') reply.redirect("/accept?message=you have to be an administrator to authorise");
                    db.collection('users').updateOne({'regno':regno},{$set:{approved:'1'}}, function (err,result){
                        if(err) reply("something went wrong!");
                        else reply("approved the user with regno : "+regno);
                    });
                });
            }
        }
    });
    server.route({
        method: 'GET',
        path :'/admindash',
        handler: function(request,reply){
            const db = request.mongo.db;

            if(!request.state.session){
                reply.redirect("/login?message=you need to log in to your acount in order to authorise");


                // reply("you need to log in to your acount in order to authorise");
            }
            else{
                var message = request.query.message;
                db.collection('users').findOne({'username':request.state.session.user},function (err,result){
                
                    if(result.admin=='0') reply.redirect("/accept?message=you have to be an administrator to authorise");

                    // if(result.admin=='0') reply("you have to be an administrator to authorise");
                // 
                    else db.collection('users').findOne({'username':request.state.session.user},function (err,result){
                        var year = result.year;
                        var semester = result.semester;
                console.log("###########################################################")
                db.collection('users').find({'year':year,'semester':semester,'admin':'0',approved:'0'}).toArray(function (err, result) {
                    console.log(result);
                    var jsarray = ['approve'];
                    reply.view('admindash',{message:message,jscript:jsarray,year:year,semester:semester,students:result},{layout:'adminlayout'});
                });





                      
                    });
                });
            }
        }
    });
   /// add admin check for these functions
    server.route({
        method: 'GET',
        path: '/createuser',
        handler: function(request,reply){
            if(!request.state.session) {reply.redirect('/login?message=log in first');
                        return;}
            var message = request.query.message;
            reply.view('createuser',{message:message},{layout:'adminlayout'});            
            
        }
    });

        server.route({
        method: 'POST',
        path: '/registeradmin',
        handler: function (request, reply) {

            var name = request.payload.fname +" "+ request.payload.lname;
            var phone = request.payload.phone;
            // var regno = request.payload.regno;
            var year = request.payload.year;
            var semester= request.payload.semester;
            var username = request.payload.username;
            var password = request.payload.password;
            var lab = request.payload.lab;
                const db = request.mongo.db;
            var exist = 0;
            
            if(!(name&&phone&&lab&&username&&password&&semester&&year)){
                if(!name) console.log("name not present");
                if(!phone) console.log("phone not present");
                if(!username) console.log("username not present");
                if(!password) console.log("password not present");
                if(!semester) console.log("semester not present");
                if(!year) console.log("year not present");
                // if(!regno) console.log("regno not present");
                if(!lab) console.log("lab not present");
                
                reply.redirect('/createuser?message=incomplete');
                // reply.view('login',{message:"incomplete"},{layout:"loginlay"});
            }
            else if(username){
                db.collection('users').findOne({'username':username}, function (err, result) {
                if(result) exist = 1; 

            if(exist==1) 

                reply.redirect('/createuser?message=Username already exists');

                // reply.view('login',{message:"exists"},{layout:"loginlay"});

            else{
            db.collection('users').insert({phone:phone,year:year,semester:semester,name:name,username:username,password:password,approved:'0',admin:'1'});
                db.collection('admin').insert({username:username,lab:lab});
                reply.redirect('/createuser?message=Registered');
            // reply.view('login',{message:"success"},{layout:"loginlay"});

            }    


            });

 
            }

        }
    });


    server.route({
        method: 'GET',
        path: '/{lab}/{expt}',
        handler: function(request,reply){
            if(!request.state.session) {reply.redirect('/login?message=log in first');
                        return;}
            var lab = request.params.lab;
            var expt = request.params.expt;
            var message = request.query.message;
            const db = request.mongo.db;
            // const ObjectID = request.mongo.ObjectID;
            // reply("here"); return;
            db.collection('labsdata').findOne({'lab':lab,'expt':expt}, function (err, result) {
                if(!result) reply().redirect('/notfound');
                else
                {
                                var exptname = result.name;
                                //var wiki = result.wiki;
                                var demofile = result.demofile;
                                var manual = result.manual;
                   //             console.log(wiki);

                                // reply.file('./public/experiment.html');

                reply.view('experiment',{lab:lab,exptname:exptname,expt:expt,message:message,demofile:demofile,manual:manual},{layout:'layout'});
                }
            });


        }
    });
    server.route({
        method: 'GET',
        path: '/quiz/{lab}/{expt}',
        handler: function(request,reply){
            if(!request.state.session) {reply.redirect('/login?message=log in first');
                        return;}
            var lab = request.params.lab;
            var expt = request.params.expt;
            const db = request.mongo.db;
            const ObjectID = request.mongo.ObjectID;
            
            db.collection('quiz').find({'lab':lab,'expt':expt}).toArray(function (err, result) {
         //           console.log(result);

                if(result.length==0) {
                    var url = "/"+lab+"/"+expt+"?message=quiz not available at the moment";
                    reply().redirect(url); return;} 
                else
                {
                    var x = "/quizscore/"+lab+"/"+expt+"?message=already submitted";
                    // reply.redirect(x);
                    // return;
                db.collection('submissions').count({'lab':lab,'expt':expt,'user':request.state.session.user}, function (err, count){
                        
                        if(count>0) {reply.redirect(x); return;}
                                           // console.log(result);
                var jsarray = ['quizjs'];
                reply.view('quiz',{jscript:jsarray,quiz:result,lab:lab,expt:expt});
  
                    });
                // reply.view('quiz',{quiz:result[0]});
                }
            });
            // reply.view('quiz',{lab:'edc',expt:'1'});

        }
    });    
    server.route({
        method: 'GET',
        path: '/video/{lab}/{expt}',
        handler: function(request,reply){
            if(!request.state.session) {reply.redirect('/login?message=log in first');
                        return;}
            var lab = request.params.lab;
            var expt = request.params.expt;
            const db = request.mongo.db;
            const ObjectID = request.mongo.ObjectID;
            console.log(lab+expt);
            db.collection('video').findOne({'lab':lab,'expt':expt},function (err, result) {
                if(result){

                    reply.view('videopage',{video:result.iframe});
                    // reply.view('videopage');
                    
                }
                else
                {
                    reply.redirect('/'+lab+'/'+expt+'?message=no video found');
                }

                
            });
            // reply.view('quiz',{lab:'edc',expt:'1'});

        }
    });    
    
    server.route({
        method: 'GET',
        path: '/quizscore/{lab}/{expt}',
        handler: function(request,reply){
            if(!request.state.session) {reply.redirect('/login?message=log in first');
                        return;}
            var lab = request.params.lab;
            var expt = request.params.expt;
            const db = request.mongo.db;
            // const ObjectID = request.mongo.ObjectID;
            db.collection('quiz').find({'lab':lab,'expt':expt}).toArray(function (err,result){
                console.log(result);
                var quiz = result;

                db.collection('labsdata').findOne({'lab':lab,'expt':expt},function (err,labsdata){
                    var exname = labsdata.name;

                    //console.log(labsdata);
                    db.collection('submissions').find({'lab':lab,'expt':expt,'user':request.state.session.user}).toArray(function (err, result){
                    var answers = result;
                    var score = answers[0].score;
                    var timestamp = answers[0].timestamp;
                    var questions = answers[0].questions;//no of questions
                    //console.log(answers[0].score);
                    reply.view("quizscore",{exname:exname,score:score,questions:questions,timestamp:timestamp,analysis:true,quiz:quiz,answers:answers});
                });
                });

            });
            
            
        }
    });    
    server.route({
        method: 'POST',
        path: '/getRelated',
        handler: function(request,reply){
            if(!request.state.session) {reply.redirect('/login?message=log in first');
                        return;}
            var lab = request.payload.lab;
            // var expt = request.params.expt;
            const db = request.mongo.db;
            // const ObjectID = request.mongo.ObjectID;
            db.collection('labsdata').find({'lab':lab},{'lab':true,'name':true,'expt':true}).toArray(function (err,result){
                //console.log(result);
                reply(JSON.stringify(result));

            });
            
            
        }
    });
    server.route({
        method: 'POST',
        path: '/submitquery',
        handler: function(request,reply){
            if(!request.state.session) {reply.redirect('/login?message=log in first');
                        return;}
            const db = request.mongo.db;
            var user = request.state.session.user;
            var teacher = request.payload.teacher;
            var query = request.payload.query;
            //var qid;
            var datetime = new Date();
            var jsondata = [];
            jsondata.user = user;
            jsondata.teacher = teacher;
            jsondata.query = query;
            db.collection('queries').insert({'user':user,'teacher':teacher,'query':query}, function (err, result){
                db.collection('threads').insert({'threadid':result.insertedIds[0].toString(),'author':user,'response':query,'timestamp':datetime});
                reply.redirect('/myqueries?message=Query submitted!');

            });
            
            
            
        }
    });
    server.route({
        method :'GET',
        path : '/myqueries',
        handler :function(request, reply){
            if(!request.state.session) {reply.redirect('/login?message=log in first');
                        return;}
            const db = request.mongo.db;
            var user = request.state.session.user;
            db.collection('queries').find({'user':user}).toArray(function (err, result){
                var queries = result;
                //console.log(queries);
                var jsarray = ['queries'];
                reply.view('myqueries',{queries:queries,jscript:jsarray});
            });            
        }
    });
    server.route({
        method :'GET',
        path : '/querydash',
        handler :function(request, reply){
            if(!request.state.session) {reply.redirect('/login?message=log in first');
                        return;}
            if(!request.state.session.isadmin==true) {reply.redirect('/login?message=you are not an admin'); return;}
            const db = request.mongo.db;
            var user = request.state.session.user;
            db.collection('queries').find({'teacher':user}).toArray(function (err, result){
                var queries = result;
                //console.log(queries);
                var jsarray = ['queries'];
                reply.view('myqueries',{queries:queries,jscript:jsarray},{layout:'adminlayout'});
            });            
        }
    });
    server.route({
        method : 'GET',
        path: '/querythread/{threadid}',
        handler : function(request,reply){
            if(!request.state.session) {reply('[{"status":"errored","message":"session timed out, please log in again"}]');return;}
            const db = request.mongo.db;
            var threadid = request.params.threadid;
            db.collection('threads').find({'threadid':threadid}).toArray(function (err,result){
                // result.status = "success";
                //console.log(result);
                reply(JSON.stringify(result));
            });
        }
    });
    server.route({
        method: 'POST',
        path: '/querythread',
        handler: function(request, reply){
            if(!request.state.session) {reply('[{"status":"errored","message":"session timed out, please log in again"}]');return;}
            const db = request.mongo.db;
            var threadid = request.payload.threadid;
            var author = request.state.session.user;
            //seen1 is seen status of admin and seen2 is of student
            var datetime = new Date();
            var response = request.payload.response;
            db.collection('threads').insert({'threadid':threadid,'author':author,'response':response,'timestamp':datetime}, function (err,result){
                if(err) reply('[{"status":"errored","message":"response not sent, please try again"}]');
                else reply.redirect('/querythread/'+threadid);
            });
        }
    });
    server.route({
        method: 'GET',
        path: '/askaquery',
        handler: function(request,reply){
            if(!request.state.session) {reply.redirect('/login?message=log in first');
                        return;}
            const db = request.mongo.db;
            // const ObjectID = request.mongo.ObjectID;
            db.collection('users').find({'admin':'1'}).toArray(function (err,result){
                //console.log(result);
                var teachers = result;
                reply.view('askaquery',{teachers:teachers});

            });
            
            
        }
    });    
    server.route({
        method: 'GET',
        path: '/sdemo/{lab}/{expt}',
        handler: function(request,reply){
            if(!request.state.session) {reply.redirect('/login?message=log in first');
                        return;}
            var lab = request.params.lab;
            var expt = request.params.expt;
            const db = request.mongo.db;
            const ObjectID = request.mongo.ObjectID;
            
            
            
        }
    });
    server.route({
        method: 'GET',
        path: '/demo',
        handler: function(request,reply){
            if(!request.state.session) {reply.redirect('/login?message=log in first');
                        return;}
         reply.view('cir',{message:request.query.message},{ layout: 'none' });
        }

    });
    server.route({
        method: 'GET',
        path: '/notfound',
        handler: function(request,reply){
            if(!request.state.session) {reply.redirect('/login?message=log in first');
                        return;}
         reply.view('404.html',{},{layout:'none'});
        }

    });
  server.route({
        method: 'GET',
        path: '/iframe.html',
        handler: function(request,reply){
         reply("hello "+request.state.session.user);
        }

    });
    server.route({
        method: 'POST',
        path: '/submitquiz',
        handler: function(request,reply){
            if(!request.state.session) {reply.redirect('/login?message=log in first');
                        return;}
            var lab = request.query.lab;
            var expt = request.query.expt;
            const db = request.mongo.db;
            const ObjectID = request.mongo.ObjectID;
            
            db.collection('quiz').find({'lab':lab,'expt':expt}).toArray(function (err, result) {
                if(!result) reply().redirect('/accept');
                else
                {   
                    var datetime = new Date();
                    var answered_json = request.payload;
                    var answers;//answers from db
                    var checks;//submitted answers
                    var score = 0;
                    var i;
                  //  console.log(result.length);
                    for(i=0;i<result.length;i++){
                        // console.log('chutiya');
                        // console.log("question "+)
                        if(answered_json[result[i].quid]==result[i].answer) score++;
                    }
                    //console.log(answered_json);
                    //console.log(result);
                    answered_json.user = request.state.session.user;
                    answered_json.lab = lab;
                    answered_json.expt = expt;
                    answered_json.score = score;
                    var questions = result.length;//number of questions
                    answered_json.questions = questions;
                    answered_json.timestamp = datetime;
                    db.collection('submissions').insert(answered_json);
                    reply.view('quizscore',{message:"successfully submitted the quiz",timestamp:datetime,score:score,lab:lab,expt:expt,user:request.state.session.user,questions:questions});

                }
            });
            // reply.view('quiz',{lab:'edc',expt:'1'});

        }
    });

    server.route({
        method: 'GET',
        path: '/assessments',
        handler: function (request, reply) {
            if(!request.state.session) {reply.redirect('/login?message=log in first');
                        return;}
            var username = request.state.session.user;
            const db = request.mongo.db;
            //console.log(username);
            db.collection('submissions').find({'user':username}).toArray(function (err,result){
                //console.log(result);
                reply.view('assessments',{labs:result});
            });
    }
    });


    server.route({
        method: 'GET',
        path: '/testi',
        handler: function (request, reply) {
            reply.view('insert',{},{layout:'adminlayout'});
    }
    });
    server.route({
        method: 'GET',
        path: '/crquiz',
        handler: function (request, reply) {
            if(!request.state.session||!request.state.session.isadmin)
                reply.redirect('/login?message=you are not an admin or session timed out log in again');
            reply.view('quizcreate',{},{layout:'adminlayout'});
    }
    });
    server.route({
        method: 'GET',
        path: '/testing',
        handler: function (request, reply) {
            // const db = request.mongo.db;
            // db.collection('dummy').insert({'name':'sush','game':'cs'},function (err,result){
                // console.log(result);
                // var c = result.insertedIds[0].toString();
                // reply(typeof(result.insertedIds[0].toString()));
                // db.collection('dummy').insert({'name':result.insertedIds[0].toString()});
                // reply(typeof(result.insertedIds[0].toString()));
                reply.view('testing',{},{layout:'none'});
// 
            // });

    }
    });

    server.route({
        method: 'POST',
        path: '/insert',
        handler: function (request, reply) {
            var name = request.payload.name;
            var lab = request.payload.lab;
            var expt = request.payload.number;
            var demofile = request.payload.demofile;
            var manual = request.payload.manual;
            const db = request.mongo.db;
            db.collection('labsdata').insert({lab:lab,expt:expt,name:name,demofile:demofile,manual:manual});
            reply.redirect("/testi");
    }
    });
    server.route({
        method: 'GET',
        path: '/addvideo',
        handler: function (request, reply) {
            reply.view("addvideo");
    }
    });

    server.route({
        method: 'POST',
        path: '/insert_video',
        handler: function (request, reply) {
            var lab = request.payload.lab;
            var expt = request.payload.number;
            var iframe = request.payload.iframe;
            const db = request.mongo.db;
            db.collection('video').insert({lab:lab,expt:expt,iframe:iframe});
            reply.redirect("/addvideo");
    }
    });
    server.route({
        method: 'POST',
        path: '/insert_ques',
        handler: function (request, reply) {
            var question = request.payload.question;
            var answer = request.payload.answer;
            var option1 = request.payload.option1;
            var option2 = request.payload.option2;
            var option3 = request.payload.option3;
            var option4 = request.payload.option4;
            var lab = request.payload.lab;
            var expt = request.payload.number;
            
            const db = request.mongo.db;
            db.collection('quiz').count({'lab':lab,'expt':expt},function (err,result){
                result = result + 1;
                db.collection('quiz').insert({quid:lab+expt+result,lab:lab,expt:expt,question:question,answer:answer,option1:option1,option2:option2,option3:option3,option4:option4});

                // console.log(result);
                
                reply.view('quizcreate',{message:'inserted '+result+'th question in '+lab+' lab`s '+expt+'th experiment'});
            });
            
    }
    });

    // server.route({
    //     method: 'GET',
    //     path: '/testi',
    //     handler: {
    //         view: 'login'
    //     }
    // });


    server.route({
        method: 'GET',
        path: '/logout',
        handler: function(request,reply){''
            if(!request.state.session) reply.redirect("/login?message=log in first");
            else reply().unstate('session').redirect('/login?message=logged out');
        }
    });
    server.route({
        method: '*',
        path: '/auth',
        handler: function (request, reply) {
            //reply('Hello, ' + encodeURIComponent(request.payload.username) + encodeURIComponent(request.payload.password)+'!');
            const db = request.mongo.db;
            const ObjectID = request.mongo.ObjectID;
            db.collection('users').findOne({'username':request.payload.username}, function (err, result) {
 
            //     if (err) {
            //         return reply(Boom.internal('Internal MongoDB error', err));
            //     }
	//	console.log(result.password + "& you entered "+ request.payload.password);
                if(result&&result.password==request.payload.password){
                    // console.log(request.state.session);
                    if(result.admin=='1'){
                        // reply.view('admindash',{message:"logged in"},{layout:"adminlayout"});
                    reply("Please wait").state('session', { 'user':request.payload.username,'username':request.payload.username,'isloggedin':true,'isadmin':true ,'name':result.name }).redirect('/admindash?message=login successful');

                        return;
                    }
                    else if(result.approved=='0') {
                        reply.view('login',{message:"Student not approved, please contact faculty advisor."},{layout:"loginlay"});
                    }
                    else 
                    reply("Please wait").state('session', { 'user':request.payload.username,'isloggedin':true,'isadmin':false ,'name':result.name }).redirect('/accept?message=login successful');

                }
                else{
                    reply.view('login',{message:"wrong username or password"},{layout:"loginlay"});

                }            });
            // db.collection('users').insert( { username: request.payload.username, password:request.payload.password } );
        }


    });

    server.route({
        method: 'GET',
        path: '/materialize',
        handler: function (request, reply) {
            reply.file('./public/materialize/css/materialize.min.css');
        }
    });
    server.route({
        method: 'GET',
        path: '/jquery',
        handler: function (request, reply) {
            reply.file('./public/materialize/js/jquery-3.2.1.min.js');
        }
    });
    server.route({
        method: 'GET',
        path: '/materializejs',
        handler: function (request, reply) {
            reply.file('./public/materialize/js/materialize.min.js');
        }
    });
    server.route({
        method: 'GET',
        path: '/js/{jslink}',
        handler: function (request, reply) {
            reply.file('./public/materialize/js/'+request.params.jslink);
        }
    });    
    server.route({
        method: 'GET',
        path: '/css/{csslink}',
        handler: function (request, reply) {
            reply.file('./public/materialize/css/'+request.params.csslink);
        }
    });    
    server.route({
        method: 'GET',
        path: '/js/vendor/{jslink}',
        handler: function (request, reply) {
            reply.file('./public/materialize/js/vendor/'+request.params.jslink);
        }
    });    
    server.route({
        method: 'GET',
        path: '/js/circuits/{jslink}',
        handler: function (request, reply) {
            reply.file('./public/materialize/js/circuits/'+request.params.jslink);
        }
    }); 
server.route({
        method: 'GET',
        path: '/js/gwt/clean/images/{jslink}',
        handler: function (request, reply) {
            reply.file('./public/materialize/js/clean/images/'+request.params.jslink);
        }
    });
    server.route({
        method: 'GET',
        path: '/js/gwt/clean/{jslink}',
        handler: function (request, reply) {
            reply.file('./public/materialize/js/clean/'+request.params.jslink);
        }
    }); 

    server.route({
        method: 'GET',
        path: '/fonts/roboto/{font}',
        handler: function (request, reply) {
            // reply('./public/materialize/fonts/roboto/'+request.params.font);
            reply.file('./public/materialize/fonts/roboto/'+request.params.font);
        }
    });
    server.route({
        method: 'GET',
        path: '/fonts/{font}',
        handler: function (request, reply) {
            // reply('./public/materialize/fonts/roboto/'+request.params.font);
            reply.file('./public/materialize/fonts/'+request.params.font);
        }
    });
    server.route({
        method: 'GET',
        path: '/scripts/logicsim/{jslink}',
        handler: function (request, reply) {
            // reply(request.params.jslink);
            // reply.file('./public/materialize/README.md');

            reply.file('./public/logicsim/scripts/'+request.params.jslink);
        }
    });

    server.route({
        method: 'GET',
        path: '/images/{img}',
        handler: function (request, reply) {
            reply.file('./public/images/'+request.params.img);
        }
    });
    server.route({
        method: 'GET',
        path: '/manual/{manual}',
        handler: function (request, reply) {
            // reply('./public/manuals/'+request.params.lab+request.params.no+".pdf");
            reply.file('./public/manuals/'+request.params.manual);
        }
    });
    server.route({
        method: 'GET',
        path: '/examples/{filename}',
        handler: function (request, reply) {
            reply.file('./public/manuals/'+request.params.filename+".pdf");
        }
    });
    server.route({
        method: 'GET',
        path: '/quiz/{filename}',
        handler: function (request, reply) {
            reply.file('./public/manuals/'+request.params.filename+".pdf");
        }
    });
    server.route({
        method: 'GET',
        path: '/sim/{lab}/{expt}',
        handler: function (request, reply) {
            var lab = request.params.lab;
            if(lab=="eda") reply.view('simeda',null,{layout:'blank'});
            else if(lab=="cs") reply.file('./public/logicsim/index.html');
            else if(lab=="dsd") reply.file('./public/logicsim/index.html');
            else if(lab=="mpmc") reply.view('simmpmc');
            else  reply.view('simerr');
        }
    });
    server.route({
        method: 'GET',
        path: '/sim/cs/images/{img}',
        handler: function (request, reply) {
            var img = request.params.img;
            reply.file('./public/images/'+img);
        }
    });server.route({
        method: 'GET',
        path: '/sim/dsd/images/{img}',
        handler: function (request, reply) {
            var img = request.params.img;
            reply.file('./public/images/'+img);
        }
    });
});
server.route({
    method: 'GET',
    path: '/{name}',
    handler: function (request, reply) {
        reply.redirect('notfound');
    }
});
server.route({
    method: 'GET',
    path: '/*',
    handler: function (request, reply) {
        reply.redirect('notfound');
    }
});
server.register({
    register: Good,
    options: {
        reporters: {
            console: [{
                module: 'good-squeeze',
                name: 'Squeeze',
                args: [{
                    response: '*',
                    log: '*'
                }]
            }, {
                module: 'good-console'
            }, 'stdout']
        }
    }
}, (err) => {

    if (err) {
        throw err; // something bad happened loading the plugin
    }

    server.start((err) => {

        if (err) {
            throw err;
        }
        server.log('info', 'Server running at: ' + server.info.uri);
    });
});




