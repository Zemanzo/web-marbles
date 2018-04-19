# web-marbles
Aims to recreate Marble Racing from the ground up, as a fully web based game. Inspired by the original Marble Racing Twitch game:  
- Twitch: http://twitch.tv/marbleracing  
- Discord: https://discord.gg/MarbleRacing  

This project is very much a work in progress.

Other sources used:  
https://github.com/mrdoob/three.js/tree/master/utils/exporters/blender

## Project configuration
You can easily configure the game settings by tweaking the values in `config.js`.

## nginx configuration
To make sure websockets work when using nginx, add the following to your `location /` section:
```
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_set_header Host $host;
```
