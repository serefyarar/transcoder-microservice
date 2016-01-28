#!/bin/bash
cd /home/ubuntu/transcoder 
git pull origin master
npm update
pm2 restart all 