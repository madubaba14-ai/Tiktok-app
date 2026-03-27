"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, RefreshCw, WifiOff } from "lucide-react";
import { useVideoStore, Video } from "@/stores/video-store";
import { VideoCard } from "./video-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VideoFeedProps {
  className?: string;
  onComment?: (videoId: string) => void;
  onShare?: (videoId: string) => void;
  onAuthorClick?: (authorId: string) => void;
}

export function VideoFeed({
  className,
  onComment,
  onShare,
  onAuthorClick,
}: VideoFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [currentVisibleIndex, setCurrentVisibleIndex] = useState(0);

  const {
    videos,
    currentIndex,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    fetchVideos,
    likeVideo,
    unlikeVideo,
    setCurrentIndex,
  } = useVideoStore();

  // Fetch initial videos
  useEffect(() => {
    if (videos.length === 0 && !isLoading) {
      fetchVideos(true);
    }
  }, [videos.length, isLoading, fetchVideos]);

  // Set up intersection observer for scroll detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const itemHeight = container.clientHeight;
      const newIndex = Math.round(scrollTop / itemHeight);

      if (newIndex !== currentVisibleIndex && newIndex >= 0 && newIndex < videos.length) {
        setCurrentVisibleIndex(newIndex);
        setCurrentIndex(newIndex);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [currentVisibleIndex, videos.length, setCurrentIndex]);

  // Set up infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !isLoadingMore) {
          fetchVideos();
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [hasMore, isLoadingMore, fetchVideos]);

  // Handle like
  const handleLike = useCallback(
    (videoId: string) => {
      likeVideo(videoId);
    },
    [likeVideo]
  );

  // Handle unlike
  const handleUnlike = useCallback(
    (videoId: string) => {
      unlikeVideo(videoId);
    },
    [unlikeVideo]
  );

  // Handle retry
  const handleRetry = useCallback(() => {
    fetchVideos(true);
  }, [fetchVideos]);

  // Scroll to specific video
  const scrollToVideo = useCallback(
    (index: number) => {
      const container = containerRef.current;
      if (!container) return;

      const itemHeight = container.clientHeight;
      container.scrollTo({
        top: itemHeight * index,
        behavior: "smooth",
      });
    },
    []
  );

  // Preload next videos
  useEffect(() => {
    const preloadIndex = currentVisibleIndex + 1;
    if (preloadIndex < videos.length) {
      const nextVideo = videos[preloadIndex];
      if (nextVideo) {
        // Preload video by creating a link element
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = nextVideo.videoUrl;
        link.as = "video";
        document.head.appendChild(link);

        return () => {
          document.head.removeChild(link);
        };
      }
    }
  }, [currentVisibleIndex, videos]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide bg-black",
        className
      )}
      style={{ scrollBehavior: "smooth" }}
    >
      {/* Video Items */}
      {videos.map((video, index) => (
        <div
          key={video.id}
          className="w-full h-full snap-start snap-always flex-shrink-0"
          style={{ height: "100dvh" }}
        >
          <VideoCard
            video={video}
            isActive={index === currentVisibleIndex}
            onLike={handleLike}
            onUnlike={handleUnlike}
            onComment={onComment}
            onShare={onShare}
            onAuthorClick={onAuthorClick}
          />
        </div>
      ))}

      {/* Load More Trigger */}
      <div
        ref={loadMoreRef}
        className="w-full h-24 flex items-center justify-center snap-start"
      >
        <AnimatePresence mode="wait">
          {isLoadingMore && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-white/60"
            >
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Loading more videos...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Initial Loading State */}
      <AnimatePresence>
        {isLoading && videos.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black"
          >
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-white animate-spin" />
              <span className="text-white/60">Loading videos...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      <AnimatePresence>
        {error && videos.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black"
          >
            <div className="flex flex-col items-center gap-4 text-center px-6">
              {error.includes("network") || error.includes("fetch") ? (
                <WifiOff className="w-12 h-12 text-white/60" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <span className="text-red-400 text-2xl">!</span>
                </div>
              )}
              <p className="text-white/60">{error}</p>
              <Button
                variant="outline"
                size="lg"
                onClick={handleRetry}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      <AnimatePresence>
        {!isLoading && !error && videos.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black"
          >
            <div className="flex flex-col items-center gap-4 text-center px-6">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-white/60 text-4xl">🎬</span>
              </div>
              <h3 className="text-white text-xl font-semibold">No videos yet</h3>
              <p className="text-white/60 max-w-sm">
                Be the first to create and share amazing content with the
                community!
              </p>
              <Button variant="default" size="lg">
                Create Video
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll Progress Indicator (Side) */}
      {videos.length > 1 && (
        <div className="fixed right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-50">
          {videos.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToVideo(index)}
              className={cn(
                "w-1 h-6 rounded-full transition-all",
                index === currentVisibleIndex
                  ? "bg-white h-8"
                  : "bg-white/30 hover:bg-white/50"
              )}
              aria-label={`Go to video ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
