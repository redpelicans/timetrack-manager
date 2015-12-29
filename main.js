var debug = require('debug')('main:init')
  , filter = {repo: "redpelicans/timetrack"}
  , doBuild = require('./lib/build') 
  //, doPush = require('./lib/push') 
  , async = require('async') 
  , params = require('./params.js')
  , githook = require('./lib/githook').create(params.server.port);

console.log("GitHook server is waiting for events  on port " + params.server.port);

githook(filter).on('all', function( payload ){
  //console.log(payload);
  //console.log(payload.original.commits);
  if(payload.original.created && payload.tag){
    // async.waterfall([
    //     build(payload.sha, commitHasTag(payload.sha), payload)
    //   , push(commitHasTag(payload.sha), payload.tag, payload)
    // ], function(err, imageName){
    //   if(err)console.error( err);
    // })
  }else if(payload.event === 'push' && (payload.branch === 'master' || payload.branch.match(/^hotfix-/))){
    async.waterfall([
      build(payload.sha, commitHasTag(payload.sha), payload)
    ], function(err, imageName){
      if(err)console.error( err);
    })
  }
});

function build(commit, tag, payload){
  return function(cb){ doBuild(commit, tag, cb) }
}


// function push(commit, tag, payload){
//   return function(imageName, cb){ doPush(commit, tag, 'timetrack', cb) }
// }

function commitHasTag(commit){
  return commit.slice(0, 12);
}


