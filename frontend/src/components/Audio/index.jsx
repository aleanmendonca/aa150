import { Button } from "@material-ui/core";
import React, { useRef, useEffect, useState } from "react";
import CustomAudioPlayer from "./CustomAudioPlayer";

const LS_NAME = 'audioMessageRate';

const Audio = ({url}) => {
    const audioRef = useRef(null);
    const [audioRate, setAudioRate] = useState(parseFloat(localStorage.getItem(LS_NAME) || "1"));
    const [showButtonRate, setShowButtonRate] = useState(false);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  
    useEffect(() => {
      audioRef.current.playbackRate = audioRate;
      localStorage.setItem(LS_NAME, audioRate);
    }, [audioRate]);
  
    useEffect(() => {
      audioRef.current.onplaying = () => {
        setShowButtonRate(true);
      };
      audioRef.current.onpause = () => {
        setShowButtonRate(false);
      };
      audioRef.current.onended = () => {
        setShowButtonRate(false);
      };
    }, []);
  
    const toggleRate = () => {
      let newRate = null;
  
      switch (audioRate) {
        case 0.5:
          newRate = 1;
          break;
        case 1:
          newRate = 1.5;
          break;
        case 1.5:
          newRate = 2;
          break;
        case 2:
          newRate = 0.5;
          break;
        default:
          newRate = 1;
          break;
      }
  
      setAudioRate(newRate);
    };
  

    return (
      <>
        <CustomAudioPlayer src={url} />

      </>
    );
}

export default Audio;