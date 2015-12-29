var Docker = require('dockerode')
  , _ = require('lodash');


docker = new Docker({host: 'http://10.254.254.2', port: 4000});

function listImages(cb){
  docker.listImages({all: true}, function(err, images){
    if(err) return cb(err);
    _.each(images, console.log);
    cb(null);
  });
}

listImages(function(err){
  if(err) console.err(err);
});

