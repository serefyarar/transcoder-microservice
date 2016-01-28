module.exports = {  
    "aws":{  
        "accessKeyId": "", 
        "secretAccessKey": "", 
        "region":"eu-central-1",
        "bucket":"Your-Target-Bucket",
        "params" : {
            "QueueUrl" : "Your-Queue-ARN",
            "TargetArn" : 'Your-SNS-ARN',
        },
    },
    "folders":{  
        "temp":"output",
        "remote": "uploads"
    },
    "presets":{  
        "video":[  
            {  
                "size":"?x720",
                "audio_bitrate":192,
                "alias":"720p.mp4"
            },
            {  
                "size":"640x480",
                "audio_bitrate":1280,
                "alias":"480p.mp4"
            }
        ],
        "image":[  
            {  
                "size":"610x342",
                "alias":"large"
            },
            {  
                "size":"290x163",
                "alias":"medium"
            },            
            {  
                "size":"140x79",
                "alias":"small"
            }
        ]
    }
};