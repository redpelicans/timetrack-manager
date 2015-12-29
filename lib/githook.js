var express = require("express")                                                                                                                                                               
  , bodyParser = require('body-parser')
  , EventEmitter = require("events").EventEmitter
  , util = require("util")
  , crypto = require('crypto')  
  , debug = require("debug")()
  , _ = require("lodash");


function GitHook(emitter, filters){
  var githook = this;
  emitter.on("data", function(event, signature, delivery, originalPayload){
    var payload = simplifyPayload(event, signature, delivery, originalPayload);
    
    if(matchFilters(payload, filters)){
      githook.emit('all', payload);

      // did we do any branch work?
      if ( originalPayload.created && originalPayload.forced && payload.branch ) {
        githook.emit( 'branch:add', payload );
      }
      if (  originalPayload.deleted && originalPayload.forced && payload.branch ) {
        githook.emit( 'branch:delete', payload );
      }

      // how about files?
      if ( payload.files.added.length > 0 ) {
        githook.emit( 'file:add', payload );
      }
      if ( payload.files.deleted.length > 0 ) {
        githook.emit( 'file:delete', payload );
      }
      if ( payload.files.modified.length > 0 ) {
        githook.emit( 'file:modify', payload );
      }
      if ( payload.files.all.length > 0 ) {
        githook.emit( 'file:all', payload );
      }

      // tagging?
      if ( payload.tag && originalPayload.created ) {
        githook.emit( 'tag:add', payload );
      }
      if ( payload.tag && originalPayload.deleted ) {
        githook.emit( 'tag:delete', payload );
      }
    }
  });
}
util.inherits( GitHook, EventEmitter );

module.exports.create = function(port){
  var emitter = new EventEmitter();
  listen(emitter, port);

  return function(settings){
    return new GitHook(emitter, settings);
  }
}

function listen(emitter, port){

  function errors(err, req, res, next) {
    if (!err) return next();
    console.log(err.stack);
    res.sendStatus(403);
  }

  function checksecret(req, res, next){
    var secret = process.env['GITHOOK_SECRET'];
    if(!secret)console.error('Warning GITHOOK_SECRET is not set!');
    var hash = crypto.createHmac('sha1', secret);
    hash.update(JSON.stringify(req.body));
    var signature = 'sha1='+ hash.digest('hex');
    if(signature === req.get('x-hub-signature'))return next();
    next(new Error("Cannot validate GitHub's signature for delivery [" + req.get('x-github-delivery') + "]!"));
  };

  app = express();
  app.use(bodyParser.json());
  app.post('/', checksecret, function(req, res, next){
    var event = req.get('x-github-event')
      , signature = req.get('x-hub-signature')
      , delivery = req.get('x-github-delivery');

    emitter.emit('data', event, signature, delivery, req.body);
    res.send();
  });
  app.use(errors);

  app.listen(port);
  debug('gitHook is listen on port : %d', port);
}


function simplifyPayload( event, signature, delivery, payload ) {
  payload = payload || {};

  var branch = '';
  var tag = '';
  var rRef = /refs\/(tags|heads)\/(.*)$/;

  // break out if it was a tag or branch and assign
  var refMatches = ( payload.ref || "" ).match( rRef );
  if ( refMatches ) {
    if ( refMatches[1] === "heads" ) {
      branch = refMatches[2];
    }
    if ( refMatches[1] === "tags" ) {
      tag = refMatches[2];
    }
  }

  // if branch wasn't found, use base_ref if available
  if ( !branch && payload.base_ref ) {
    branch = payload.base_ref.replace( rRef, '$2' );
  }

  var simpler = {
    original: payload,
    event: event,
    signature: signature,
    delivery: delivery,
    files: {
      all: [],
      added: [],
      deleted: [],
      modified: []
    },
    tag: tag,
    branch: branch,
    repo: payload.repository ? (payload.repository.owner.name + '/' + payload.repository.name) : null,
    sha: payload.after,
    time: payload.repository ? payload.repository.pushed_at : null,
    urls: {
      head: payload.head_commit ? payload.head_commit.url : '',
      branch: '',
      tag: '',
      repo: payload.repository ? payload.repository.url : null,
      compare: payload.compare
    },
    reset: !payload.created && payload.forced,
    pusher: payload.pusher ? payload.pusher.name : null,
    owner: (payload.repository && payload.repository.owner) ? payload.repository.owner.name : null
  };

  if ( branch ) {
    simpler.urls.branch = simpler.urls.branch + '/tree/' + branch;
  }
  if ( tag ) {
    simpler.urls.tag = simpler.urls.head;
  }

  // populate files for every commit
  (payload.commits || []).forEach( function( commit ) {
    // github label and simpler label ( make 'removed' deleted to be consistant )
    _.each( { added: 'added', modified: 'modified', removed: 'deleted' }, function( s, g ) {
      simpler.files[ s ] = simpler.files[ s ].concat( commit[ g ] );
      simpler.files.all = simpler.files.all.concat( commit[ g ] );
    });
  });

  return simpler;
}


function matchFilters(payload, filters){
  function check(what){ 
    var f = filters[what]
      , p = payload[what];

    if(!f || f === '*') return true;

    if(f === p) return true;

    if( _.isString( f ) && f[0] === "!" && f.slice(1) == p ) return true;

    if(_.isRegExp(f)){
      var match = p.match(f);
      if (match)  return true;
    }

    if(_.isFunction(f)){ return f(p, payload ) };

  };

  if ( !payload ) { return false };

  filters = filters || {};

  return _.all(['repo', 'branch', 'tag', 'event'], check);
}
