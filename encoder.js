//Daemonize
//Message from aws.
//Create ami.
//Set s3 event preferences.
var http 	= require('http');
var fs 		= require('fs');
var async 	= require('async'); 
var AWS 	= require('aws-sdk'); 
var ffmpeg 	= require('fluent-ffmpeg');
var helper = {
	remoteFile : function(folder,id,filename){
		var filename = filename.substring(filename.lastIndexOf('/')+1);
		var filePath = folder.join("/") + "/" + id + "/" + filename;
		return filePath;
	},
	videoFile : function(folder,id,alias){
		return folder+"/"+id+"_"+alias;
	},
	imageFile : function(folder,id,alias){
		return folder+"/"+id+"_"+alias+"_%i"+".jpg";
	}
};
module.exports = {
	encode: function(file,config,s3,cb){
		async.auto({
			config : function(callback){
				callback(null,config);
			},
			file : 	function(callback){
				callback(null,file);
			},
			remoteFolder : ['config','file',function(callback,result){
				d = new Date();
				var parts = [
					result.config.folders.remote,
					d.getFullYear(), 
					d.getMonth()+1,
					d.getDate(),
					d.getHours()
				];
				callback(null,parts);
			}],
			checkFile : ['config','file','remoteFolder',function(callback,result){
				var input = ffmpeg(result.file.url).format('mp4');
				input.ffprobe(0, function(error, data) {
					if(error){
						callback(error,null);
					}else{
					    var duration = parseInt(data.streams[0].duration);
					    if(duration > 0){
					    	callback(null,duration);
					    }else{
					    	callback("Source is not a video",null);
					    }
				    }
			  	});			
			}],
			convertVideos : ['checkFile',function(callback,result){
				var input = ffmpeg(result.file.url).format('mp4').addOptions([
	                '-movflags faststart'
	            ]);
				var outputs = [];
				result.config.presets.video.forEach(function(type){
					var output	= helper.videoFile(result.config.folders.temp,result.file.id,type.alias);
					input.size(type.size).videoCodec('libx264').output(output);
					outputs.push(output);
				});
				input.on('progress', function(progress) {
					http.get({
					    host: 'vidivodo.io',
					    path: '/transcoder/progress?upload_token='+result.file.id+'&progress='+progress
					});
				}).on('end',function(){
					callback(null,outputs);
				}).on('error',function(error){
					callback(error,null);
				}).run();			
				
			}],
			createThumbnails : ['checkFile',function(callback,result){
				var interval = 0;
				var outputs = [];
				result.config.presets.image.forEach(function(type,index){
					var input = ffmpeg(result.file.url);
					input.screenshots({
				    	count: 10,
				    	filename: helper.imageFile(result.config.folders.temp,result.file.id,type.alias),
					    size: type.size,
				  	}).on('filenames', function(filenames) {
				    	outputs = outputs.concat(filenames);
				  	}).on('error',function(error){
						callback(error,null);
					}).on('end',function(){
						interval++;
						if(interval == result.config.presets.image.length){
							callback(null,outputs);
						}
					});
				});
			}],
			uploadToCloud : ['convertVideos','createThumbnails',function(callback,results){
				
				var allFiles = results.createThumbnails.concat(results.convertVideos);		
				var interval = 0;
				allFiles.forEach(function(file){
					fs.readFile(file, function(error, fileData) {
						if(error){
							callback(error,null);
						}else{
							s3.putObject({
								Bucket: results.config.aws.bucket, 
								Key: helper.remoteFile(results.remoteFolder,results.file.id,file), 
								Body: fileData
							},function(error,data) {
								if (error) {
									callback(error,null);
								}else{
									interval++;
									if(interval == allFiles.length){
										callback(null,allFiles);
									}
								}
							});
						}
					});	
				});	
			}],
			removeFiles : ['uploadToCloud',function(callback,results){
				var interval = 0;
				results.uploadToCloud.forEach(function(file){
					fs.unlink(file, function(error) {
						if (error) {
							callback(error,null);
						}else{
							interval++;
							if(interval == results.uploadToCloud.length){
								callback(null,true);
							}
						}
					});
				});		
			}]
		},cb);
	}
};