var async = require('async')
  , https = require('https')
  , log = require('npmlog')
  , util = require('util')
  , moment = require('moment')
  , Docker = require('dockerode')
  , DockerIO = require('./helpers').DockerIO
  , doSpawn = require('./helpers').doSpawn
  , $ = require('./helpers').$
  , _ = require('lodash');


function push(version, tag, imageName, cb){
  var context = {
    get runningImageName(){ return imageName + ":" + this.version },
    get newImageName(){ return util.format("%s/%s:%s", context.dockerHubRepoName, 'timetrack', context.tag) },
    dockerHubRepoName: 'coderedinc',
    docker: new Docker(),
    tag: tag,
    version: version,
    //repo: 'git@github.com:CodeRedInc/Timetrack.git',
    // dockerAuth: {
    //   username: 'ebasley',
    //   password: '',
    //   email: 'eric.basley@redpelicans.com',
    //   serveraddress: "https://index.docker.io/v1/"
    // }
  }

  console.log("\n____________ PUSH PROCESS ____________\n");
  console.log("You dream of a new Timetrack's version?");
  console.log("Will push a new image: {name:%s, date: %s}", context.newImageName, moment().format('MMMM Do YYYY, HH:mm:ss'));
  console.log("Let's push it...\n");
  async.waterfall([
    //   createGitDir.bind(null, context)
    // , gitClone
    // , gitCheckout
    // , gitTag
    // , gitPush
    dockerTag.bind(null, context)
    //, dockerAuth
    , dockerPush
  ], function(err){
    if(err)return cb(err);
    console.log("\n____________ END PUSH {date: %s} ____________\n", moment().format('MMMM Do YYYY, HH:mm:ss'));
    cb(null, context.newImageName);
  })

  function createGitDir(context, cb){
    context.tmpDir = util.format("./tmp/%s", context.version);
    var cmd =  util.format("rm -rf %s ", context.tmpDir);
    doExec(cmd, $(context, cb));
  }

  function gitClone(context, cb){
    var cmd = util.format("git clone %s %s", context.repo, context.tmpDir);
    doExec(cmd, {strict: false}, $(context, cb));
  }

  function gitCheckout(context, cb){
    var cmd = util.format("cd %s && git checkout %s", context.tmpDir, context.version);
    doExec(cmd, {strict: false}, $(context, cb));
  }

  function gitTag(context, cb){
    var cmd = util.format("cd %s && git tag -a %s -m 'version %s'", context.tmpDir, context.tag, context.tag);
    doExec(cmd, {strict: false}, $(context, cb));
  }

  function gitPush(context, cb){
    var cmd = util.format("cd %s && git push origin %s", context.tmpDir, context.tag);
    doExec(cmd, {strict: false}, $(context, cb));
  }

  function dockerTag(context, cb){
    var image = context.docker.getImage(context.runningImageName);
    image.tag({repo: util.format("%s/%s", context.dockerHubRepoName, 'timetrack'), tag: context.tag}, function(err){
      if(err)return cb(err);
      log.info("docker", "docker  tag %s %s/%s:%s", context.runningImageName, context.dockerHubRepoName, 'timetrack', context.tag);
      cb(null, context);
    });
  }

  function dockerAuth(context, cb){
    context.docker.checkAuth({
      username: 'ebasley',
      password: '',
      email: 'eric.basley@redpelicans.com',
      serveraddress: "https://index.docker.io/v1/"
    }, function(err, data){
      if(err)return cb(err);
      cb(null, context);
    });
  }

  function dockerPush(context, cb){
    doSpawn('docker', ['push', context.newImageName], {strict: false}, $(context, cb));
  }

}



module.exports = push;
