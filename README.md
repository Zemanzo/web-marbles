[![Discord](https://img.shields.io/discord/478527288854708226.svg?color=%237289DA&label=discord&logo=discord)](https://discord.gg/XB3k9T5)
[![Dependencies](https://img.shields.io/david/Zemanzo/web-marbles.svg)](https://david-dm.org/Zemanzo/web-marbles)
[![TravisCI](https://img.shields.io/travis/com/Zemanzo/web-marbles.svg)](https://travis-ci.com/Zemanzo/web-marbles)
[![Patreon](https://img.shields.io/badge/support%20us-patreon-%23e85b46.svg)](https://www.patreon.com/webmarbles)

# web-marbles

![Cinematic shot of the environment so far](https://i.imgur.com/bUGES4s.jpg)

Aims to recreate Marble Racing from the ground up, as a fully web based game. The goal is to make it cost-effective, being able to run it on a relatively low-cost server leaving all rendering to the client. Inspired by the [original Marble Racing](http://twitch.tv/marbleracing) Twitch game.

This project is very much a work in progress.

## Project configuration
You can find how to set up the project [here](https://github.com/Zemanzo/web-marbles/wiki/Tutorials-%E2%80%95-setup).

## Concept
To keep server load to a minimum, all it does is handle basic game logic and the physics simulation. It runs the physics simulation locally and sends over the resulting data to all the clients. Only positions and rotations of the marbles have to be synced real-time, other data can be pre-loaded and generated based on RPCs.

### Limitations
Since there is no simple UDP API / standard for the web yet, we are limited to TCP only. This means our packets will quickly clog the websocket if the client's internet is too slow or unstable. I've built around this by limiting the amount of packet requests that can be done, but it's not comparable to proper UDP.

Additionally, when there are **many** marbles to sync, this will significantly stress the network. This is a problem for both the server and the client as bandwidth is limited. This is likely to be the biggest issue with this implementation, so a lot of care will be put in optimizing and minimizing network impact.

Downloading assets can be costly when it comes to bandwidth, and should probably be done from a different server, ideally by a CDN. This reduces the impact on the real-time connections of the game server.

Since the client has to render their own scene, I won't be able to guarantee the same level of visual fidelity for every client.

### Advantages
Since the client has to render their own scene, they can completely independently pick their own camera angles. Even so, a shared camera is still possbile through identical tracking algorithms.

Only the physics run on the server which are relatively resource efficient. My $5 DigitalOcean VPS handles it nicely up to *at least* 100 marbles. Slowdowns do happen with more marbles, but it keeps on going nonetheless.
