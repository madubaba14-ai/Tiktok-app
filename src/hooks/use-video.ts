"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useVideoStore } from "@/stores/video-store";

interface UseVideoOptions {
  videoId: string;
  videoUrl: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

interface UseVideoReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  isMuted: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  volume: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  reportView: () => Promise<void>;
  getWatchTime: () => number;
}

export function useVideo({
  videoId,
  videoUrl,
  autoPlay = true,
  onEnded,
  onTimeUpdate,
}: UseVideoOptions): UseVideoReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Default muted for auto-play
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const watchTimeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const viewReportedRef = useRef(false);
  useVideoStore(); // Keep store connection for potential future use

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Play video
  const play = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.error("Error playing video:", error);
        // Auto-play was prevented, try with muted
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          videoRef.current.play().catch(console.error);
        }
      });
    }
  }, []);

  // Pause video
  const pause = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
  }, []);

  // Toggle play/pause
  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // Seek to specific time
  const seek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // Set volume
  const setVolume = useCallback((vol: number) => {
    if (videoRef.current) {
      videoRef.current.volume = vol;
      setVolumeState(vol);
      if (vol > 0 && isMuted) {
        videoRef.current.muted = false;
        setIsMuted(false);
      }
    }
  }, [isMuted]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Report view to API
  const reportView = useCallback(async () => {
    if (viewReportedRef.current) return;
    viewReportedRef.current = true;

    try {
      await fetch(`/api/videos/${videoId}/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watchTime: watchTimeRef.current }),
      });
    } catch (error) {
      console.error("Error reporting view:", error);
    }
  }, [videoId]);

  // Set up video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
      reportView();
    };

    const handleTimeUpdate = () => {
      const current = video.currentTime;
      setCurrentTime(current);
      
      // Track watch time
      const diff = current - lastTimeRef.current;
      if (diff > 0 && diff < 1) {
        watchTimeRef.current += diff;
      }
      lastTimeRef.current = current;

      onTimeUpdate?.(current, video.duration);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      if (autoPlay) {
        play();
      }
    };

    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);
    const handleVolumeChange = () => {
      setVolumeState(video.volume);
      setIsMuted(video.muted);
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("volumechange", handleVolumeChange);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("volumechange", handleVolumeChange);
    };
  }, [autoPlay, onEnded, onTimeUpdate, play, reportView]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchTimeRef.current > 0) {
        reportView();
      }
    };
  }, [reportView]);

  // Reset refs when video changes - refs don't cause re-renders
  // Note: Video element state (currentTime, playing, etc.) will reset naturally when src changes
  // If you need to reset all state, use a key prop on the component using this hook
  useEffect(() => {
    watchTimeRef.current = 0;
    lastTimeRef.current = 0;
    viewReportedRef.current = false;
  }, [videoId, videoUrl]);

  // Get watch time (for external use)
  const getWatchTime = useCallback(() => watchTimeRef.current, []);

  return {
    videoRef,
    isPlaying,
    isMuted,
    isBuffering,
    currentTime,
    duration,
    progress,
    volume,
    play,
    pause,
    toggle,
    seek,
    setVolume,
    toggleMute,
    reportView,
    getWatchTime,
  };
}
