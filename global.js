//unused right now
const fs = require("fs"),
    ffmpeg = require("ffmpeg-cli"),
    { execSync } = require('child_process'),
    mediainfo = require('mediainfo-static'),
    path = require("path")
module.exports = {
    /* Prompt Defaults */
    defaults: {
        input: "videos.txt",
        output: "output.mp4",
        clips: 20,
        minstream: 0.2,
        maxstream: 0.4,
        width: 640,
        height: 480,
        fps: 30,
        usetransitions: false,
        transitions: "transitions.txt"
    },
    /* Plugin consts */
    ffmpeg: ffmpeg,
    mediainfo: mediainfo,
    /* Uses MediaInfo to get video information */
    getVideoProbe: (video) => {
        //Taken from https://www.npmjs.com/package/video-length
        //Not using package due to invalid params with mediainfo-static
        let vid = `"${video.replace(/\//g,(process.platform === "win32" ? "\\\\" : "/"))}"`;
        var ccwd = __dirname
        process.chdir(path.dirname(mediainfo.path));
        let stdout = execSync(path.basename(mediainfo.path)+" "+vid+' --full --output=JSON');
        if(stdout) {
            process.chdir(ccwd);
            let specs = JSON.parse(stdout.toString());
            let { track } = specs.media;
            if(!track){
                throw new TypeError('Can\'t extract video specs');
            }
            // General info
            let general_specs = track.find(i => i['@type'] == 'General');
            if(!general_specs){
                throw new TypeError('Can\'t find "General" specs');
            }
            // Video track specs
            let video_specs = track.find(i => i['@type'] == 'Video');
            if(!video_specs){
                throw new TypeError('Can\'t find "Video" track');
            }
            let { Duration, FrameRate, OverallBitRate, FileSize } = general_specs;
            let { Width, Height } = video_specs;
            return {
                duration : parseFloat(Duration),
                width    : parseFloat(Width),
                height   : parseFloat(Height),
                fps      : parseFloat(FrameRate),
                bitrate  : parseFloat(OverallBitRate),
                size     : parseFloat(FileSize),
            };
        }
    },
    /* Uses MediaInfo to get audio information */
    getAudioProbe: (video) => {
        //Taken from https://www.npmjs.com/package/video-length
        //Modified
        let vid = `"${video.replace(/\//g,(process.platform === "win32" ? "\\\\" : "/"))}"`;
        let stdout = execSync(path.basename(mediainfo.path)+" "+vid+' --full --output=JSON');
        var cwd = __dirname
        process.chdir(path.dirname(mediainfo.path));
        if(stdout) {
            process.chdir(ccwd);
            let specs = JSON.parse(stdout.toString());
            let { track } = specs.media;
            if(!track){
                throw new TypeError('Can\'t extract audio specs');
            }
            // General info
            let general_specs = track.find(i => i['@type'] == 'General');
            if(!general_specs){
                throw new TypeError('Can\'t find "General" specs');
            }
            let { Duration, OverallBitRate, FileSize } = general_specs;
            return {
                duration : parseFloat(Duration),
                bitrate  : parseFloat(OverallBitRate),
                size     : parseFloat(FileSize),
            };
        }
    },
    /* Trims down videos to a specific time and length */
    snipVideo: (video, startTime, endTime, output, resolution, fps, debug) => {
        var args = " -i \"" + `${video.replace(/\\/g,"\\\\").replace(/\//g,(process.platform === "win32" ? "\\\\" : "/"))}` + "\" -ss " + startTime + " -to " + endTime + " -pix_fmt yuv420p -vf scale=" + resolution[0]+"x" + resolution[1] + ",setsar=1:1,fps=fps=" + fps + " -ar 44100 -ac 2 -map_metadata -1 -map_chapters -1 -y \"" + output + ".mp4\"";
        return ffmpeg.runSync(args + (debug == false ? " -hide_banner -loglevel quiet" : ""));
    },
    /* Copies videos to what is normally the temporary directory */
    copyVideo: (video, output, resolution, fps, debug) => {
        var args =" -i \"" + `${video.replace(/\\/g,"\\\\").replace(/\//g,(process.platform === "win32" ? "\\\\" : "/"))}` + "\" -pix_fmt yuv420p -vf scale="+resolution[0]+"x"+resolution[1]+",setsar=1:1,fps=fps="+fps + " -ar 44100 -ac 2 -map_metadata -1 -map_chapters -1 -y \"" + output + ".mp4\"";
        return ffmpeg.runSync(args + (debug == false ? " -hide_banner -loglevel quiet" : ""));
    },
    /* Writes a concat.txt and merges it together, this is unlike the original YTP+ as it now allows for any amount of video files
        This should NOT be used in plugins */
    concatenateVideo: (count, out, debug) => {
        var command1 = "";
        for (var i=0; i<count; i++) {
            if (fs.existsSync(__dirname+"/shared/temp/video" + i + ".mp4") == true) {
                let newline = ""
                if(command1 != "") {
                    newline = "\n"
                }
                command1 = command1.concat(newline+"file '" + __dirname+"/shared/temp/video" + i + ".mp4'"); 
            }
        }
        fs.writeFileSync(__dirname+"/shared/temp/concat.txt", command1)
        return ffmpeg.runSync("-f concat -safe 0 -i \""+__dirname+"/shared/temp/concat.txt\" -af aresample=async=1 -pix_fmt yuv420p -ar 44100 -ac 2 -map_metadata -1 -map_chapters -1 -af aresample=async=1 \""+out+"\"" + (debug == false ? " -hide_banner -loglevel quiet" : ""));
    },

    
    /* Get a random integer between a minimum and a maximum number */
    randomInt: (min, max) => {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
}
