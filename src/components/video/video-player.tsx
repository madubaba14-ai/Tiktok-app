"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string | null;
  isActive?: boolean;
  onVideoEnd?: () => void;
}

export function VideoPlayer({
  videoUrl,
  thumbnailUrl,
  isActive = false,
  onVideoEnd,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Play video
  const play = useCallback(async () => {
    if (videoRef.current) {
      try {
        await videoRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error("Error playing video:", error);
        // Auto-play was prevented, try with muted
        if (videoRef.current) {
          videoRef.current.muted = true;
          setIsMuted(true);
          try {
            await videoRef.current.play();
            setIsPlaying(true);
          } catch (e) {
            console.error("Still cannot play:", e);
          }
        }
      }
    }
  }, []);

  // Pause video
  const pause = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // Show controls temporarily
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
    showControlsTemporarily();
  }, [isPlaying, play, pause, showControlsTemporarily]);

  // Toggle mute
  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
    showControlsTemporarily();
  }, [isMuted, showControlsTemporarily]);

  // Seek video
  const seek = useCallback((value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  }, []);

  // Format time
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Handle video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      onVideoEnd?.();
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
    };
  }, [onVideoEnd]);

  // Handle active state (auto-play when in view)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive && !isLoading) {
      video.play().catch((error) => {
        console.error("Error playing video:", error);
        // Auto-play was prevented, try with muted
        video.muted = true;
        setIsMuted(true);
        video.play().catch((e) => {
          console.error("Still cannot play:", e);
        });
      });
    } else {
      video.pause();
    }
  }, [isActive, isLoading]);

  // Handle intersection observer
  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            if (!isLoading) {
              video.play().catch(() => {
                video.muted = true;
                setIsMuted(true);
                video.play().catch(() => {});
              });
            }
          } else {
            video.pause();
          }
        });
      },
      { threshold: [0.5] }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [isLoading]);

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black"
      onClick={togglePlay}
      onTouchStart={() => showControlsTemporarily()}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnailUrl || undefined}
        className="w-full h-full object-cover"
        playsInline
        muted={isMuted}
        loop
        preload="metadata"
      />

      {/* Loading State */}
      <AnimatePresence>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt="Video thumbnail"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <Skeleton className="absolute inset-0 w-full h-full" />
            )}
            <div className="relative z-10">
              <Loader2 className="w-12 h-12 text-white animate-spin" />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Buffering Indicator */}
      <AnimatePresence>
        {isBuffering && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <Loader2 className="w-12 h-12 text-white animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play/Pause Indicator */}
      <AnimatePresence>
        {showControls && !isBuffering && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-black/40 rounded-full p-6 backdrop-blur-sm">
              {isPlaying ? (
                <Pause className="w-12 h-12 text-white" />
              ) : (
                <Play className="w-12 h-12 text-white ml-1" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls Overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress Bar */}
            <div className="mb-3">
              <Slider
                value={[currentTime]}
                min={0}
                max={duration || 100}
                step={0.1}
                onValueChange={seek}
                className="cursor-pointer"
              />
            </div>

            {/* Time and Controls */}
            <div className="flex items-center justify-between text-white text-sm">
              <div className="flex items-center gap-2">
                <span>{formatTime(currentTime)}</span>
                <span>/</span>
                <span>{formatTime(duration)}</span>
              </div>

              <button
                onClick={toggleMute}
                className="p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Side Volume Control (visible on hover) */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={toggleMute}
              className="p-2 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
