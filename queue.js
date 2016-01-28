var events	= require('events');
var util  = require("util");

var Queue = function(config,sqs,sns,s3){
  this.getFile = function(data){ //Extract the file information from queue message.
  	var message = JSON.parse(data.Messages[0].Body);
  	var input = message.Records[0].s3;
  	var id = message.Records[0].responseElements['x-amz-request-id'];
	var ReceiptHandle = data.Messages[0].ReceiptHandle;
	var url = s3.getSignedUrl('getObject', {Bucket: input.bucket.name, Key: input['object']['key']}).replace("https://","http://");
	return {
		'id' : id,
		'url' : url,
		'file' : input['object']['key'],
		'ReceiptHandle' : ReceiptHandle //It's a token for updating the queue.
	};
  };  
  this.delete = function(file){
  	var that = this;
	sqs.deleteMessage({
		QueueUrl: config.aws.params.QueueUrl,
		ReceiptHandle: file.ReceiptHandle
	}, function(error, data) {
		if(error){
			that.emit('error',error);
			return;
		}else{
			that.emit('log',"Deleted");
		}
	});
	that.check();
  };
  this.check = function(){
  	this.emit('log',"Checked");
  	var that = this;
  	sqs.receiveMessage({
		QueueUrl: config.aws.params.QueueUrl
	}, function (error, data) {
		if(error){
			that.emit('error',error);
			that.sleep();
		}else if(data.Messages){
			that.process(data);
		}else{
			that.sleep();
		}
	});
  };
  this.sleep = function(){
  	var that = this;
    setTimeout(function(){
		that.check();
	},1000);
  };  
  this.notify = function(data){
  	data = JSON.stringify(data);
  	var that = this;
	sns.publish({
	    TargetArn: config.aws.params.TargetArn, 
	    //MessageStructure: 'json',
	    Message:data, 
	    Subject: "VideoEncoded"
	},function(error,data){
	    if (error){
	        that.emit('error',error);
	    }else{
	    	that.emit('log',"Notified");
	    }
	 });
  };
  this.process = function(data){

  	var that = this;
	var file = that.getFile(data);
	this.emit('job',file);
	this.emit('log','Processing...');
  };
};
util.inherits(Queue, events.EventEmitter);

exports.Queue = Queue;