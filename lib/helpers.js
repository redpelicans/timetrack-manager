var exec = require('child_process').exec
  , spawn = require('child_process').spawn
  , log = require('npmlog')
  , debug = require('debug')('main:helpers')
  , util = require('util')
  , _ = require('lodash');

var Transform = require('stream').Transform;
util.inherits(DockerIO, Transform);

function DockerIO(options){
  if(!(this instanceof DockerIO))return new DockerIO(options);
  Transform.call(this, options);
}

DockerIO.prototype._transform = function(chunk, encoding, cb){
  var data = JSON.parse(chunk);
  var keys = Object.keys(data);
  if(_.difference(keys, ['error', 'stream', 'status']).length){
    console.log("WARN: unknown key in Docker stream: %s", keys);
    console.log(data);
  }
  if(data.error){
    this.emit('error', new Error(data.error));
  }else{
    this.push(data.stream || data.status);
  }
  cb();
}


function copyFile(src, dst, cb){
  var cmd = util.format("cp %s %s", src, dst);
  doExec(cmd, cb);
}

function doExec(cmd, options, cb){
  if(_.isFunction(options)){
    cb = options;
    options = {strict: true};
  }
  log.info("exec ", "%s", cmd);
  exec(cmd, function(err, stdout, stderr){ 
    if(debug){ if(stdout)console.log(stdout) };
    if(stderr)console.log(stderr);
    cb(options.strict ? err||stderr : err);
  });
}

function doSpawn(cmd, args, options, cb){
  var erroneous = false;

  if(_.isFunction(args)){
    cb = args;
    options = {strict: true};
    args = [];
  }else if (_.isFunction(options)){
    cb = options;
    options = {strict: true};
  }

  log.info("exec ", "%s %s", cmd, args.join(' '));
  var doit = spawn(cmd, args, options);

  doit.stderr.on('data', function(data){
    erroneous = true;
    console.error(data.toString());
  })

  doit.stdout.on('data', function(data){
    console.log(data.toString());
  })

  doit.on('close', function(code){
    if(code !==0)return cb(new Error());
    if(erroneous && options.strict)return cb(new Error());
    cb();
  })
}

function $(context, cb){
  return function(err){ cb(err, context)}
}

module.exports = {
  $: $,
  doSpawn: doSpawn,
  doExec: doExec,
  copyFile: copyFile,
  DockerIO: DockerIO
}
