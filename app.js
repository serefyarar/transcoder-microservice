var config	= require('./config.js'),
	encoder	= require('./encoder.js'),
	runner  = require('./queue.js'),
	aws 	= require('aws-sdk');

aws.config.update(config.aws);


var sqs = new aws.SQS(), //Queue'dan yeni job çekiliyor. Job'lar bir s3 eventi.
	s3 = new aws.S3(), //Encode edilen dosyalar tekrar s3'e atılıyor
	sns = new aws.SNS(); //Dosya encode edildiğinde sns topic yaratılıyor.

var queue 	= new runner.Queue(config,sqs,sns,s3);

queue.on('job',function(file){
	var queueHandler = this;
	encoder.encode(file,config,s3,function(error,results){
		if(error){
			queueHandler.emit('error',error);
		}else{
			queueHandler.notify(results);
		}
		queueHandler.delete(file);
	});
});
queue.on('error',function(error){
	console.log(error);
});
queue.on('log',function(log){
	console.log(log);
});

queue.check();