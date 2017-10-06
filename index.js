'use strict';

const Hapi = require('hapi');
const Good = require('good');
const Path = require('path');
// const Boom = require('boom');
// const Mongo = require('hapi-mongodb');
const server = new Hapi.Server();
server.connection({ port: 3000, host: '0.0.0.0' });
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
        layoutPath: Path.join(__dirname, 'public/layout')
        // layoutPath: './public/layout',
        //helpersPath: './public/materialize/js'
    });
});
server.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
        reply('Hello, world!');
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
            
            if(!request.state.session) reply.file('./public/login.html');
            else if(request.state.session.isloggedin==true) reply().redirect('/accept');
            else reply.file('./public/login.html');
        }
    });
    server.route({
        method: 'GET',
        path: '/accept',
        handler: function(request,reply){
            console.log(request.state.session);
            if(!request.state.session) reply("log in first").redirect("/login");
            else reply.view('dashboard',{name : request.state.session.user});
        }
    });
    server.route({
        method: 'GET',
        path: '/{lab}/{expt}',
        handler: function(request,reply){
            var lab = request.params.lab;
            var expt = request.params.expt;
            const db = request.mongo.db;
            // const ObjectID = request.mongo.ObjectID;
            
            db.collection('labsdata').findOne({'lab':lab,'expt':expt}, function (err, result) {
                if(!result) reply().redirect('/accept');
                else
                {
                                var exptname = result.name;
                                var wiki = result.wiki;
                                console.log(wiki);

                                // reply.file('./public/experiment.html');

                reply.view('experiment',{lab:lab,exptname:exptname,number:expt,wiki:wiki});
                }
            });


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
        path: '/testing',
        handler: function (request, reply) {
            reply.view('simeda', null, { layout: 'blank' });
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
            if(!request.state.session.isloggedin) reply("log in first").redirect("/login");
            reply().unstate('session').redirect('/login');
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
                console.log(result.username+" "+result.password);
                if(result.password==request.payload.password){
                    reply("Please wait").state('session', { 'user':request.payload.username,'isloggedin':true, 'name':result.name }).redirect('/accept');
                    // console.log(request.state.session);
                }
                else{
                    reply("Please wait").redirect('/reject');
                }
            });
            // db.collection('users').insert( { username: request.payload.username, password:request.payload.password } );
            // reply("chu");
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
        path: '/images/{img}',
        handler: function (request, reply) {
            reply.file('./public/images/'+request.params.img);
        }
    });
    server.route({
        method: 'GET',
        path: '/manual/{filename}',
        handler: function (request, reply) {
            reply.file('./public/manuals/'+request.params.filename+".pdf");
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
            if(lab=="eda") reply.view('simeda');
            else if(lab=="cs") reply.view('simcs');
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




