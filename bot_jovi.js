const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const {
    prefix,
    token
} = require('./config.json');
const client = new Discord.Client();

const queue = new Map();


async function execute(message, serverQueue) {
    //const args = message.content.split(' ');
    const song_name = message.content.substr("!play ".length);
    console.log(song_name);

    const voiceChannel = message.member.voiceChannel;

    if (!voiceChannel) 
        return message.channel.send('You need to be in a voice channel to play music!');

    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
        return message.channel.send('I need the permissions to join and speak in your voice channel!');
    }

    try{
        const songInfo = await ytdl.getInfo(song_name);
        const song = {
            title: songInfo.title,
            url: songInfo.video_url,
        };
        if (!serverQueue) {
            // Creating the contract for our queue
            const queueContruct = {
                textChannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                volume: 5,
                playing: true,
            };
            // Setting the queue using our contract
            queue.set(message.guild.id, queueContruct);
            // Pushing the song to our songs array
            queueContruct.songs.push(song);
            
            try {
                // Here we try to join the voicechat and save our connection into our object.
                var connection = await voiceChannel.join();
                queueContruct.connection = connection;
                // Calling the play function to start a song
                play(message.guild, queueContruct.songs[0]);
            } catch (err) {
                // Printing the error message if the bot fails to join the voicechat
                console.log(err);
                queue.delete(message.guild.id);
                return message.channel.send(err);
            }
        }else {
            serverQueue.songs.push(song);
            console.log(serverQueue.songs);
            return message.channel.send(`${song.title} has been added to the queue!`);
        }
    }
    catch(e){
        console.log(e);
    }
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }
    console.log(song);
    const dispatcher = serverQueue.connection.playStream(ytdl(song.url, { filter : 'audioonly' }))
    .on('end', () => {
        setTimeout(() => {
            console.log('Music ended!');
            // Deletes the finished song from the queue
            serverQueue.songs.shift();
            // Calls the play function again with the next song
            play(guild, serverQueue.songs[0]);
        },200)
    })
    .on('error', error => {
        console.error(error);
    });
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
}

function skip(message, serverQueue) {
    if (!message.member.voiceChannel) 
        return message.channel.send('You have to be in a voice channel to stop the music!');
    if (!serverQueue) 
        return message.channel.send('There is no song that I could skip!');
    serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
    if (!message.member.voiceChannel) 
        return message.channel.send('You have to be in a voice channel to stop the music!');
    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
}

client.on('message', msg => {
    if (msg.author.bot || !msg.content.startsWith(prefix)) return;
    const serverQueue = queue.get(msg.guild.id);

    if (msg.content.startsWith(`${prefix}play`)) {
        execute(msg, serverQueue);
        return;
    } else if (msg.content.startsWith(`${prefix}skip`)) {
        skip(msg, serverQueue);
        return;
    } else if (msg.content.startsWith(`${prefix}stop`)) {
        stop(msg, serverQueue);
        return;
    } else {
        msg.channel.send('You need to enter a valid command!');
    }
    /*
    if (msg.content === 'ping') {
        msg.reply('pong')
    }
    */
});

client.login(token);

client.once('ready', () => {
    console.log('Ready!');
});
client.once('reconnecting', () => {
    console.log('Reconnecting!');
});
client.once('disconnect', () => {
    console.log('Disconnect!');
});

process.on('unhandledRejection', error => console.error('Uncaught Promise Rejection', error));