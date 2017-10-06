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
server.views({
    engines: {
        html: require('handlebars')
    },
    relativeTo: __dirname,
    path: './templates',
    layoutPath: './templates/layout',
    helpersPath: './templates/helpers'
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
            if(!request.state.session) reply("log in first").redirect("/login");
            else reply.file('./public/dashboard.html');
        }
    });
    // server.route({
    //     method: 'GET',
    //     path: '/',
    //     handler: function (request, reply) {
    //         reply.view('index');
    // }
    // });
    // server.route({
    //     method: 'GET',
    //     path: '/sush',
    //     handler: {
    //         view: 'index'
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




