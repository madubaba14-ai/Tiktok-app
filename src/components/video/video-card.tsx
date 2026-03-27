"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Share2, Music, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Video } from "@/stores/video-store";
import { VideoPlayer } from "./video-player";

interface VideoCardProps {
  video: Video;
  isActive?: boolean;
  onLike?: (videoId: string) => void;
  onUnlike?: (videoId: string) => void;
  onComment?: (videoId: string) => void;
  onShare?: (videoId: string) => void;
  onAuthorClick?: (authorId: string) => void;
}

// Format large numbers
function formatCount(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + "M";
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + "K";
  }
  return count.toString();
}

export function VideoCard({
  video,
  isActive = false,
  onLike,
  onUnlike,
  onComment,
  onShare,
  onAuthorClick,
}: VideoCardProps) {
  const [isLiked, setIsLiked] = useState(video.isLiked || false);
  const [likesCount, setLikesCount] = useState(video.likesCount);
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle like toggle
  const handleLike = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);

      if (isLiked) {
        setLikesCount((prev) => Math.max(0, prev - 1));
        setIsLiked(false);
        onUnlike?.(video.id);
      } else {
        setLikesCount((prev) => prev + 1);
        setIsLiked(true);
        onLike?.(video.id);
      }
    },
    [isLiked, video.id, onLike, onUnlike]
  );

  // Handle comment
  const handleComment = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onComment?.(video.id);
    },
    [video.id, onComment]
  );

  // Handle share
  const handleShare = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onShare?.(video.id);
    },
    [video.id, onShare]
  );

  // Handle author click
  const handleAuthorClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onAuthorClick?.(video.author.id);
    },
    [video.author.id, onAuthorClick]
  );

  // Double tap to like
  const handleDoubleTap = useCallback(() => {
    if (!isLiked) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 500);
      setLikesCount((prev) => prev + 1);
      setIsLiked(true);
      onLike?.(video.id);
    }
  }, [isLiked, video.id, onLike]);

  const authorName = video.author.displayName || video.author.username;
  const authorInitial = authorName.charAt(0).toUpperCase();

  return (
    <div className="relative w-full h-full bg-black">
      {/* Video Player */}
      <div className="absolute inset-0" onDoubleClick={handleDoubleTap}>
        <VideoPlayer
          videoUrl={video.videoUrl}
          thumbnailUrl={video.thumbnailUrl}
          isActive={isActive}
        />
      </div>

      {/* Large Heart Animation on Double Tap */}
      <AnimatePresence>
        {isAnimating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1.5 }}
            exit={{ opacity: 0, scale: 2 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          >
            <Heart className="w-32 h-32 text-red-500 fill-red-500" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right Side Actions */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-10">
        {/* Author Avatar */}
        <div className="relative">
          <button onClick={handleAuthorClick} className="relative">
            <Avatar className="w-12 h-12 border-2 border-white">
              <AvatarImage
                src={video.author.avatarUrl || undefined}
                alt={authorName}
              />
              <AvatarFallback className="bg-gray-700 text-white text-sm">
                {authorInitial}
              </AvatarFallback>
            </Avatar>
          </button>
          {/* Follow button */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
            <button className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors">
              <span className="text-white text-lg leading-none">+</span>
            </button>
          </div>
        </div>

        {/* Like Button */}
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-all",
              isLiked && "text-red-500"
            )}
            onClick={handleLike}
          >
            <motion.div
              animate={isLiked ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.2 }}
            >
              <Heart
                className={cn("w-7 h-7", isLiked && "fill-current")}
              />
            </motion.div>
          </Button>
          <span className="text-white text-xs font-medium drop-shadow-lg">
            {formatCount(likesCount)}
          </span>
        </div>

        {/* Comment Button */}
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors"
            onClick={handleComment}
          >
            <MessageCircle className="w-7 h-7 text-white" />
          </Button>
          <span className="text-white text-xs font-medium drop-shadow-lg">
            {formatCount(video.commentsCount)}
          </span>
        </div>

        {/* Share Button */}
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-colors"
            onClick={handleShare}
          >
            <Share2 className="w-7 h-7 text-white" />
          </Button>
          <span className="text-white text-xs font-medium drop-shadow-lg">
            {formatCount(video.sharesCount)}
          </span>
        </div>

        {/* Music Disc */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center"
        >
          <div className="w-3 h-3 rounded-full bg-gray-900" />
        </motion.div>
      </div>

      {/* Bottom Info */}
      <div className="absolute left-0 right-20 bottom-4 p-4 z-10">
        {/* Author Info */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={handleAuthorClick}
            className="font-bold text-white text-base hover:underline"
          >
            @{video.author.username}
          </button>
          {video.author.isVerified && (
            <CheckCircle2 className="w-4 h-4 text-blue-400 fill-blue-400" />
          )}
        </div>

        {/* Caption */}
        {video.caption && (
          <p className="text-white text-sm mb-2 line-clamp-2 drop-shadow-lg">
            {video.caption}
          </p>
        )}

        {/* Hashtags */}
        {video.hashtags && Array.isArray(video.hashtags) && video.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {video.hashtags.slice(0, 5).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-transparent text-white/80 hover:text-white px-1.5 py-0.5 text-xs cursor-pointer"
              >
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Music Info */}
        <div className="flex items-center gap-2 text-white/80 text-sm">
          <Music className="w-4 h-4" />
          <motion.span
            animate={{ x: [0, -50, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="whitespace-nowrap"
          >
            Original Sound - {authorName}
          </motion.span>
        </div>
      </div>
    </div>
  );
}
