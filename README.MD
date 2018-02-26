# warframe-patch-bot

Welcome! This project is a Discord bot designed for the free-to-play
game [Warframe](http://warframe.com).

This project is currently in ALPHA, so please stand by.

If you'd like to help contribute, feel free to contact me!


## Usage

If you want to run this yourself you'll need to follow standard boilerplate for 
[Discord.io](https://github.com/izy521/discord.io)

### Where's the database schema?

Currently, I'm trying to not have this bot use a database to reduce setup overhead.
I may add a database component in the future if it becomes needed. For now
data is stored in a basic, flat JSON file.


## Adding this bot to your server

You can use [This link](https://discordapp.com/oauth2/authorize?client_id=413536424508391426&scope=bot&permissions=347200)


## History

- **Alpha 0.0.9**
    - In the most jank way possible, custom characters for the bot activation is now per-server
    - Improved storageController.js code
    - General improvments but also introduced a lot of jank

- **Alpha 0.0.5**
    - Registration functionality is done besides adding custom bot call characters
    - Registration process supports admins with multiple servers owned
    - Storage Controller code is fully implemented (for now)
    - Bot functionality has been simplified


- **Alpha 0.0.2**
    - Registration code partially implemented (No multi-server owner support yet, no error handling yet)
    - Storage Controller code is 20% implemented
    - Bot now has several server-related helper functions


- **Alpha 0.0.1**
    - First working release
    - Basic bot functions implemented


## Contributing

If you'd like to help contribute to this project or create a bot for another chat platform, feel free to
contact me! I've also done work on telegram/skype bots.