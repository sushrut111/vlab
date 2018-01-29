'use strict';

const Hapi = require('hapi');
const Good = require('good');
const Path = require('path');
const Handlebars = require('handlebars');
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
        reply.file('./public/home.html');
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
            // reply("iuhjnljk");
            // console.log(request.query.message);
            if(!request.state.session) reply.view('login',{message:request.query.message},{ layout: 'loginlay' });
            else if(request.state.session.isloggedin==true) reply().redirect('/accept');
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
                reply.view('dashboard',{name : request.state.session.user,email:result.email,message:request.query.message});
                });

            }
        }
    });
        server.route({
        method: 'POST',
        path: '/register',
        handler: function (request, reply) {
            var name = request.payload.fname + request.payload.lname;
            var phone = request.payload.phone;
            var email = request.payload.email;
            var username = request.payload.username;
            var password = request.payload.password;
                const db = request.mongo.db;
            var exist = 0;
            
            if(!(name&&phone&&email&&username&&password)){
                reply.view('login',{message:"incomplete"},{layout:"loginlay"});
            }
            else if(username){
                db.collection('users').findOne({'username':username}, function (err, result) {
                if(result) exist = 1; 

            if(exist==1) 
                reply.view('login',{message:"exists"},{layout:"loginlay"});

            else{
            db.collection('users').insert({email:email,phone:phone,email:email,name:name,username:username,password:password});
            reply.view('login',{message:"success"},{layout:"loginlay"});

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
                if(!result) reply().redirect('/accept');
                else
                {
                                var exptname = result.name;
                                var wiki = result.wiki;
                                console.log(wiki);

                                // reply.file('./public/experiment.html');

                reply.view('experiment',{lab:lab,exptname:exptname,expt:expt,wiki:wiki,message:message});
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
                    console.log(result);

                if(result.length==0) {
                    var url = "/"+lab+"/"+expt+"?message=quiz not available at the moment";
                    reply().redirect(url); return;} 
                else
                {
                    var x = "/"+lab+"/"+expt+"?message=already submitted";
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
        path: '/demo/{lab}/{expt}',
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
        path: '/circuitdemo',
        handler: function(request,reply){
            reply.file('./public/cir.html');
            
            
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
                    var answered_json = request.payload;
                    var answers;//answers from db
                    var checks;//submitted answers
                    var score = 0;
                    var i;
                    console.log(result.length);
                    for(i=0;i<result.length;i++){
                        // console.log('chutiya');
                        // console.log("question "+)
                        if(answered_json[result[i].quid]==result[i].answer) score++;
                    }
                    console.log(answered_json);
                    console.log(result);
                    answered_json.user = request.state.session.user;
                    answered_json.lab = lab;
                    answered_json.expt = expt;
                    answered_json.score = score;
                    var questions = result.length;//number of questions
                    db.collection('submissions').insert(answered_json);
                    reply.view('quizscore',{message:"successfully submitted the quiz",score:score,lab:lab,expt:expt,user:request.state.session.user,questions:questions});

                }
            });
            // reply.view('quiz',{lab:'edc',expt:'1'});

        }
    });

    server.route({
        method: 'GET',
        path: '/testi',
        handler: function (request, reply) {
            reply.view('insert');
    }
    });
    server.route({
        method: 'GET',
        path: '/crquiz',
        handler: function (request, reply) {
            reply.view('quizcreate');
    }
    });
    server.route({
        method: 'GET',
        path: '/testing',
        handler: function (request, reply) {
            reply.view('home', null, { layout: 'blank' });
    }
    });

    server.route({
        method: 'POST',
        path: '/insert',
        handler: function (request, reply) {
            var name = request.payload.name;
            var lab = request.payload.lab;
            var expt = request.payload.number;
            var wiki = request.payload.wiki;
            const db = request.mongo.db;
            db.collection('labsdata').insert({lab:lab,expt:expt,name:name,wiki:wiki});
            reply.redirect("/testi");
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
        handler: function(request,reply){
            if(!request.state.session.isloggedin) redirect("/login?message=log in first");
            reply().unstate('session').redirect('/login?message=logged out');
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
                if(result&&result.password==request.payload.password){
                    reply("Please wait").state('session', { 'user':request.payload.username,'isloggedin':true, 'name':result.name }).redirect('/accept?message=login successful');
                    // console.log(request.state.session);
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
        path: '/fonts/roboto/{font}',
        handler: function (request, reply) {
            // reply('./public/materialize/fonts/roboto/'+request.params.font);
            reply.file('./public/materialize/fonts/roboto/'+request.params.font);
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
        path: '/manual/{lab}/{no}',
        handler: function (request, reply) {
            // reply('./public/manuals/'+request.params.lab+request.params.no+".pdf");
            reply.file('./public/manuals/'+request.params.lab+request.params.no+".pdf");
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
        reply('Hello, ' + encodeURIComponent(request.params.name) + '!');
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




