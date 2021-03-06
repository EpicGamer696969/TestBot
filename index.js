const { executionAsyncResource } = require('async_hooks');
const Discord = require('discord.js');
const { lookup } = require('dns');
const ytdl = require('ytdl-core');
 
const { YTSearcher } = require('ytsearcher');
 
const searcher = new YTSearcher({
    key: process.env.youtube_api,
    revealed: true
});
 
const client = new Discord.Client();
 
const queue = new Map();
 
client.on("ready", () => {
    console.log("DavBot online")
})
 
client.on("message", async(message) => {
    const prefix = 'D';
 
    const serverQueue = queue.get(message.guild.id);
 
    const args = message.content.slice(prefix.length).trim().split(/ +/g)
    const command = args.shift().toLowerCase();
 
    switch(command){
        case 'play':
            execute(message, serverQueue);
            break;
        case 'stop':
            stop(message, serverQueue);
            break;
        case 'skip':                       //(fskip)
            skip(message, serverQueue);
           break;
 //       case 'skip':
 //           vSkip(message, serverQueue);
 //           break;
        case 'pause':
            pause(serverQueue);
            break;
        case 'resume':
            resume(serverQueue);
            break;
        case 'loop':
            Loop(args, serverQueue);
            break;
        case 'queue':
            Queue(serverQueue);
            break;

            

    }
 
    async function execute(message, serverQueue){
        if(args.length <=0)
            return message.channel.send("Play what!? Your mum's sex tape?? Tell me the name of the song, monkey.")
        let vc = message.member.voice.channel;
        if(!vc){
            return message.channel.send("YOU MONKEY! Join a VC first!");
        }else{
            let result = await searcher.search(args.join(" "), { type: "video" })
            const songInfo = await ytdl.getInfo(result.first.url)
 
            let song = {
                title: songInfo.videoDetails.title,
                url: songInfo.videoDetails.video_url
            };
 
            if(!serverQueue){
                const queueConstructor = {
                    txtChannel: message.channel,
                    vChannel: vc,
                    connection: null,
                    songs: [],
                    volume: 10,
                    playing: true,
                    loopone: false,
                    loopall: false,
                    skipVotes: []
                };
                queue.set(message.guild.id, queueConstructor);
 
                queueConstructor.songs.push(song);
 
                try{
                    let connection = await vc.join();
                    queueConstructor.connection = connection;
                    message.guild.me.voice.setSelfDeaf(true);
                    play(message.guild, queueConstructor.songs[0]);
                }catch (err){
                    console.error(err);
                    queue.delete(message.guild.id);
                    return message.channel.send(`Unable to join the VC ${err}`)
                }
            }else{
                serverQueue.songs.push(song);
                return message.channel.send(`Song added! ${song.url}`);
            }
        }
    }
    function play(guild, song){
        const serverQueue = queue.get(guild.id);
        if(!song){
            serverQueue.vChannel.leave();
            queue.delete(guild.id);
            return;
        }
        const dispatcher = serverQueue.connection
            .play(ytdl(song.url))
            .on('finish', () =>{
                if(serverQueue.loopone){
                    play(guild, serverQueue.songs[0]);

                }
                else if(serverQueue.loopall){
                    serverQueue.songs.push(serverQueue.songs[0])
                    serverQueue.songs.shift()
                }else{
                    serverQueue.songs.shift()
                }
                
                
                play(guild, serverQueue.songs[0]);
            })
            serverQueue.txtChannel.send(`Now playing ${serverQueue.songs[0].url}`)
    }
    function stop (message, serverQueue){
            if(!serverQueue)
                return message.channel.send("There is no music playing :monkey:")
        if(message.member.voice.channel != message.guild.me.voice.channel)
            return message.channel.send("YOU MONKEY! Join a VC first!")
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end();
    }
    function skip (message, serverQueue){

       

        if(message.member.voice.channel != message.guild.me.voice.channel)
            return message.channel.send("YOU MONKEY! Join a VC first!");
        if(!serverQueue)
            return message.channel.send("There is nothing to skip!");


//           message.guild.roles.cache.find(role => role.name ==="DJ")      // let roleN = member.roles.cache.some(role => role.name === 'DJ');                  

 //           if(!message.member.roles.cache.get(roleN.id))
 //               return message.channel.send("You don't have the DJ role.")
        
            serverQueue.connection.dispatcher.end();
            serverQueue.skipVotes = [];
            
    }

 //   function vSkip(message, serverQueue){
 //       if(!serverQueue)
  //           return message.channel.send("There is no music playing...you monkey.");
  //      if(message.member.voice.channel != message.guild.me.voice.channel)
  //          return message.channel.send("You are not in a VC :monkey:")

 //       let usersC = message.member.voice.channel.members.size;
//        let require = Math.ceil(usersC/2);

 //       if(serverQueue.skipVotes.includes(message.member.id))
 //          return message.channel.send("You already voted to skip.")

 //       serverQueue.skipVotes.push(message.member.id)
 //       message.channel.send(`You voted to skip the song ${serverQueue.skipVotes.length}/${require}votes`)

 //       if(serverQueue.skipVotes.length >= required){
 //           serverQueue.connection.dispatcher.end();
 //           serverQueue.skipVotes = [];
 //           message.channel.send("Song has been skipped.")
 //       }

 //   }



 
    function pause(serverQueue){
        if(!serverQueue)
            return message.channel.send("There is no music playing...you monkey.");
            if(message.member.voice.channel != message.guild.me.voice.channel)
            return message.channel.send("You are not in a VC :monkey:")
        if(serverQueue.connection.dispatcher.paused)
            return message.channel.send("You already paused this song....what do you want me to do huh? Monkey.")
        serverQueue.connection.dispatcher.pause();
        message.channel.send("The song has been paused!")



    }
    function resume(serverQueue){
        if(!serverQueue)
            return message.channel.send("There is no music playing...you monkey.");
            if(message.member.voice.channel != message.guild.me.voice.channel)
            return message.channel.send("You are not in a VC :monkey:")
        if(serverQueue.connection.dispatcher.resumed)
            return message.channel.send("You already resumed this song....what do you want me to do huh? Monkey.")
        serverQueue.connection.dispatcher.resume();
        message.channel.send("The song has been resumed!");
    }
    function Loop(args, serverQueue){
        if(!serverQueue)
            return message.channel.send("There is no music playing...you monkey.");
            if(message.member.voice.channel != message.guild.me.voice.channel)
            return message.channel.send("You are not in a VC :monkey:")
        if(args.length < 1) return message.channel.send("Please specify what type of loop - Dloop <one/all/off>")

        switch(args[0].toLowerCase()){
            case 'all':
                serverQueue.loopall = !serverQueue.loopall;
                serverQueue.loopone = false;

                if(serverQueue.loopall === true)
                    message.channel.send("Loop all turned on.");
                else 
                    message.channel.send("Loop all turned off.");
                    break;


            case 'one':
                serverQueue.loopone = !serverQueue.loopone;
                serverQueue.loopall = false;

                if(serverQueue.loopone === true)
                    message.channel.send("Loop one turned on.");
                else 
                    message.channel.send("Loop one turned off.");
                break;


            case 'off':
                serverQueue.loopall = false;
                serverQueue.loopone = false;

                message.channel.send("Loop has been turned off.")
                break;
            default:
                message.channel.send("Please specify what type of loop - Dloop <one/all/off>");
        }
    }
    function Queue(serverQueue){
        if(!serverQueue)
            return message.channel.send("There is no music playing...you monkey.");
            if(message.member.voice.channel != message.guild.me.voice.channel)
            return message.channel.send("You are not in a VC :monkey:")

        let nowPlaying = serverQueue.songs[0];
        let qMsg = (`Now playing: $(nowPlaying.title)\n-----------------------\n`)

        for(var i = 1; i < serverQueue.songs.length; i++){
            qMsg += (`$(i). $(serverQueue.songs[i].title)\n`)
        }

        message.channel.send('```' + qMsg + 'Requested by: ' + message.author.username + '```');

    }






})
 
client.login(process.env.token)
