var async = require('async')
  , spawn = require('child_process').spawn
  , exec = require('child_process').exec
  , https = require('https')
  , log = require('npmlog')
  , moment = require('moment')
  , util = require('util')
  , Docker = require('dockerode')
  , DockerIO = require('./helpers').DockerIO
  , doExec = require('./helpers').doExec
  , doSpawn = require('./helpers').doSpawn
  , $ = require('./helpers').$
  , _ = require('lodash');



function build(commit, tag, cb){

  var context = {
    timetrackDockerDir: "./timetrack-docker",
    dockerRessources: "./docker",
    get timetrackImageName(){ return "timetrack:" + this.version },
    timetrackContainerName: 'timetrack',
    host: 'timetrack.redpelicans.com',
    docker: new Docker(),
    commit: commit,
    version: tag
  }
  console.log("\n____________ BUILD PROCESS ____________\n");
  console.log("You dream of a new Timetrack's image?");
  console.log("Will create a new image: {name:%s, commit: %s, tag: %s, date: %s}", context.timetrackContainerName, context.commit, context.version, moment().format('MMMM Do YYYY, HH:mm:ss'));
  console.log("Let's build and run it ...\n");

  findImage(context.timetrackImageName, function(err, image){
    if(err) return cb(err);
    if(image){
      console.log("Image '%s' already exist, will use it.", context.timetrackImageName);
      console.log(image);
      console.log("\n____________ END BUILD {date: %s} ____________\n", moment().format('MMMM Do YYYY, HH:mm:ss'));
      return cb(null, image);
    }

    async.waterfall([
      installDockerDir.bind(null, context),
      setupHashDockerFile,
      setupVersionDockerFile,
      createTarImage,
      dockerBuild,
      dockerRemove,
      dockerCreate,
      dockerStart,
      checkServices
    ], function(err){
      if(err)return cb(err);
      console.log("\n____________ END BUILD {date: %s} ____________\n", moment().format('MMMM Do YYYY, HH:mm:ss'));
      cb(null, context.timetrackImageName);
    })
  });

  function findImage(name, cb){
    context.docker.listImages({all: true}, function(err, images){
      if(err) return cb(err);
      var image = _.find(images, function(image){
        return _.find(image.RepoTags, function(tag){ return tag === name });
      });
      cb(null, image);
    });
  }

  function dockerRemove(context, cb){
    log.info("docker", "Check for running container ...");
    var regexp = new RegExp(context.timetrackContainerName);
    context.docker.listContainers({all: true}, function(err, containers){
      if(err)return cb(err);
      var runningTimetrackInfo = _.find(containers, function(containerInfo){
        return _.find(containerInfo.Names, function(name){ return regexp.test(name) });
      });
      if(runningTimetrackInfo){
        log.info("docker", "Found this one:");
        console.log(runningTimetrackInfo)
        var container = context.docker.getContainer(runningTimetrackInfo.Id);
        log.info("docker", "Remove it.");
        container.remove({force: true, v:true}, $(context, cb));
      }else{
        log.info("docker", "No running container to remove");
        cb(null, context);
      }
    });
  }


  function dockerCreate(context, cb){
    var config = {
      Image: context.timetrackImageName,
      name: context.timetrackContainerName,
      Hostname: context.timetrackContainerName,
      AttachStdin: false,
      AttachStdout: false,
      AttachStderr: false,
      Tty: false,
      //Cmd: [ "bash", "/start", "--debug" ]
    }

    log.info("docker", "Running timetrack container ...");
    context.docker.createContainer(config, function(err, container){ cb(err, context, container) });
  }

  function dockerStart(context, container, cb){
    var config = {
      //Binds: [util.format("%s:/config", __dirname + "/../config")],
      Binds: ["/opt/timetrack:/config"],
      RestartPolicy: {name: 'always'},
      NetworkMode: "swarm"
    };
    container.start(config, function(err){
      if(err)return cb(err);
      container.inspect(function(err, data){
        if(err)return cb(err);
        console.log(data);
        console.log("\n\n");
        log.info("docker", "%s is now running with timetrack rev: %s", context.timetrackContainerName, context.version);
        cb(null, context);
      });
    });
  }

  function createTarImage(context, cb){
    doSpawn('tar', ['cf', 'dockerfile.tar', 'Dockerfile', 'start.sh' ], {cwd: context.timetrackDockerDir, strict: false}, $(context, cb));
  }

  function dockerBuild(context, cb){
    context.docker.buildImage(util.format("%s/dockerfile.tar", context.timetrackDockerDir), {nocache: true, t: context.timetrackImageName}, function(err, stream){
      if(err)return cb(err);
      var dockerio = new DockerIO();
      stream.pipe(dockerio).pipe(process.stdout);
      stream.on('end', function(){ cb(null, context) });
      stream.on('error', function(err){ cb(err) });
      dockerio.on('error', function(err){ cb(err) });
    });
  }

  function setupHashDockerFile(context, cb){
    var cmd =  util.format("cd %s && sed -i 's/__HASH__/%s/' Dockerfile", context.timetrackDockerDir, context.commit);
    doExec(cmd, {strict: false}, $(context, cb));
  }

  function setupVersionDockerFile(context, cb){
    var cmd =  util.format("cd %s && sed -i 's/__VERSION__/%s/' Dockerfile", context.timetrackDockerDir, context.version);
    doExec(cmd, {strict: false}, $(context, cb));
  }


  function installDockerDir(context, cb){

    function removeDir(cb){
      var cmd =  util.format("rm -rf %s ", context.timetrackDockerDir);
      doExec(cmd, cb);
    }

    function mkdir(cb){
      var cmd =  util.format("mkdir -p %s ", context.timetrackDockerDir);
      doExec(cmd, cb);
    }


    function copyFiles(cb){
      var cmd = util.format("cp %s/* %s", context.dockerRessources, context.timetrackDockerDir);
      doExec(cmd, cb);
    }

    async.waterfall([ removeDir, mkdir, copyFiles ], $(context, cb));
  }

  function checkServices(context, cb){
    log.info("check", "Checking deployed services...");
    async.parallel({
      //Mongo: testMongo.bind(null, context),
      Timetrack: testTimetrack.bind(null, context)
    }, function(err, data){
      Object.keys(data).forEach(function(key){
        var meth = data[key] ? 'info' : 'warn';
        log[meth](key, "===> %s", data[key] ? ' is up' : ' seems down !!');
      });
      console.log("\n");
      cb(null, _.every(_.values(data), _.identity));
    });
  }

  function testMongo(context, cb){
    log.info("docker", "Check for running MongoDb container ...");
    var regexp = new RegExp('mongo');
    context.docker.listContainers({all: true}, function(err, containers){
      if(err)return cb(err);
      var runningInfo = _.find(containers, function(containerInfo){ return _.find(containerInfo.Names, function(name){ return regexp.test(name) }) });
      if(runningInfo){
        log.info("docker", "Found a MongoDB container:");
        var container = context.docker.getContainer(runningInfo.Id);
        container.inspect(function(err, data){
          if(err)return cb(err);
          log.info("docker", "mongo IPAddress is %s", data.NetworkSettings.IPAddress);
          var cmd =  "nc -vz " + data.NetworkSettings.IPAddress + " 27017" ;
          exec(cmd, function(err, stdout, stderr){ cb(null, !err) });
        });
      }else{
        log.info("docker", "No running MongoDB container");
        cb(null, false);
      }
    });
  }

  // TODO: do /health
  function testTimetrack(context, cb){
    setTimeout(function(){
      var options = { hostname: context.host, port: 80, path: '/ping', method: 'GET', rejectUnauthorized: false, agent: false, requestCert: true, timeout: 5000 };
      var req = https.request(options, function(res){
        if(res.statusCode != 200) return cb(null, false);
        res.on('data', function(data){ 
          var ping = JSON.parse(data.toString());
          cb(null, ping.data == 'pong' ? true: false) 
        });
      });
      req.end();
      req.on('error', function(e){ cb(null, false) });
    }, 2000);
  }
}

module.exports = build;
