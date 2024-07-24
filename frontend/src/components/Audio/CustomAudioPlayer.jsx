import React, {useEffect, useRef, useState} from 'react';
import {Button} from "@mui/material";
import {
    IconButton,
    Slider,
    Typography,
    Box, FormControl, Menu,
} from '@material-ui/core';
import {PlayArrow, Pause, VolumeUp, GetApp, MoreVert} from '@material-ui/icons';
import './OgvAudioPlayer.css';
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";

var ogv = require('ogv');
const CustomAudioPlayer = ({src, onPlay}) => {
    const audioRef = useRef(null);
    const playerRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [player, setPlayer] = useState(null);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [volume, setVolume] = useState(1);
    const [anchorEl, setAnchorEl] = useState(null);

    OGVLoader.base = '/ogv'
    let isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    useEffect(async () => {
        try {
            if (!isIOS)
                return;

            if (audioRef.current) {
                const ogvPlayer = new window.OGVPlayer({
                    type: 'audio/ogg'
                });

                ogvPlayer.src = src;

                ogvPlayer.addEventListener('loadedmetadata', () => {
                    setDuration(ogvPlayer.duration);
                });

                ogvPlayer.addEventListener('timeupdate', () => {
                    setCurrentTime(ogvPlayer.currentTime);
                });

                ogvPlayer.addEventListener('ended', () => {
                    setIsPlaying(false);
                    setCurrentTime(0);
                });
                if (onPlay) {
                    ogvPlayer.addEventListener('play', onPlay);
                }

                ogvPlayer.preload = 'none';
                ogvPlayer.load();

                // Append OGVPlayer element to the audioRef div
                audioRef.current.appendChild(ogvPlayer);
                setPlayer(ogvPlayer);

                playerRef.current = ogvPlayer;

                return () => {
                    ogvPlayer?.pause();
                    audioRef?.current?.removeChild(ogvPlayer);
                };
            }
        } catch (e) {
            console.error(e);
        }
    }, [src, onPlay]);

    const handlePlayPause = () => {
        if (isPlaying) {
            player.pause();
        } else {
            player.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (event, newValue) => {
        const time = (newValue / 100) * duration;
        player.currentTime = time;
        setCurrentTime(time);
    };

    const handleVolumeChange = (event, newValue) => {
        const newVolume = newValue / 100;
        player.volume = newVolume;
        setVolume(newVolume);
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    };
    return (
        <>
            {isIOS && (
                <Box className="ogv-audio-player" p={2} bgcolor="background.paper" borderRadius={8} boxShadow={1}>
                    <div ref={audioRef} className="audio-container"/>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <IconButton onClick={handlePlayPause} size="small">
                            {isPlaying ? <Pause/> : <PlayArrow/>}
                        </IconButton>
                        <Slider
                            value={(currentTime / duration) * 100}
                            onChange={handleSeek}
                            aria-labelledby="continuous-slider"
                            style={{flex: 1, margin: '0 10px'}}
                        />
                        <Typography variant="caption" style={{minWidth: 60, textAlign: 'center'}}>
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </Typography>
                        <IconButton component="a" href={src} download size="small">
                            <GetApp/>
                        </IconButton>
                    </Box>
                </Box>
            )}

            {!isIOS && (
                <audio  ref={audioRef} src={src} preload="none" controls >
                    <source src={src} type="audio/ogg"/>
                </audio>
            )}
        </>
    );
};
export default CustomAudioPlayer;
