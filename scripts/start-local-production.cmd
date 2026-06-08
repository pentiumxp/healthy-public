@echo off
set "HEALTHY_DB_PATH=C:\Users\xuxin\Documents\healthy\data\healthy.sqlite"
set "HEALTHY_REGISTRATION_KEY_PATH=C:\ProgramData\HermesMobile\data\plugin-secrets\health-owner-key.txt"
cd /d C:\Users\xuxin\Documents\healthy
"C:\Program Files\nodejs\node.exe" src\app\http-server.js
