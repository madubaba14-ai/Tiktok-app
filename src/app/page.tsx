'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { VideoFeed } from '@/components/video/video-feed';
import { CommentsSheet } from '@/components/comments/comments-sheet';
import { ProfileSheet } from '@/components/profile/profile-sheet';
import { UploadModal } from '@/components/upload/upload-modal';
import { SearchModal } from '@/components/search/search-modal';
import { AuthProvider, useAuth } from '@/components/providers/auth-provider';
import { useVideoStore } from '@/stores/video-store';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type FeedType = 'foryou' | 'following';
type ActiveSheet = 'none' | 'comments' | 'profile' | 'upload' | 'search';

function HomePageContent() {
  const [feedType, setFeedType] = useState<FeedType>('foryou');
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>('none');
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [videosWatched, setVideosWatched] = useState(0);
  const [showAdPrompt, setShowAdPrompt] = useState(false);
  
  const { user, isAuthenticated, showAuthModal } = useAuth();
  const { fetchVideos } = useVideoStore();

  // Fetch videos when feed type changes
  useEffect(() => {
    fetchVideos(true);
  }, [feedType, fetchVideos]);

  // Simulated ad integration - show ad prompt every 5 videos
  // Using a ref to track and show ad without setting state in effect
  const handleVideoView = useCallback(() => {
    const newCount = videosWatched + 1;
    setVideosWatched(newCount);
    if (newCount > 0 && newCount % 5 === 0) {
      setShowAdPrompt(true);
    }
  }, [videosWatched]);

  // Handle comment click
  const handleComment = useCallback((videoId: string) => {
    setSelectedVideoId(videoId);
    setActiveSheet('comments');
  }, []);

  // Handle share click
  const handleShare = useCallback(async (videoId: string) => {
    if (!isAuthenticated) {
      showAuthModal('login');
      return;
    }
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Check out this video on TikVibe!',
          url: `${window.location.origin}/?video=${videoId}`,
        });
        toast.success('Video shared!');
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}/?video=${videoId}`);
        toast.success('Link copied to clipboard!');
      }
    } catch {
      // User cancelled share
    }
  }, [isAuthenticated, showAuthModal]);

  // Handle author click
  const handleAuthorClick = useCallback((authorId: string) => {
    setSelectedUserId(authorId);
    setActiveSheet('profile');
  }, []);

  // Handle create click
  const handleCreate = useCallback(() => {
    if (!isAuthenticated) {
      showAuthModal('register');
      return;
    }
    setActiveSheet('upload');
  }, [isAuthenticated, showAuthModal]);

  // Handle profile click
  const handleProfileClick = useCallback(() => {
    if (!isAuthenticated) {
      showAuthModal('login');
      return;
    }
    setSelectedUserId(user?.id || null);
    setActiveSheet('profile');
  }, [isAuthenticated, showAuthModal, user?.id]);

  // Handle inbox click
  const handleInboxClick = useCallback(() => {
    if (!isAuthenticated) {
      showAuthModal('login');
      return;
    }
    toast.info('Inbox coming soon!');
  }, [isAuthenticated, showAuthModal]);

  // Handle search click
  const handleSearchClick = useCallback(() => {
    setActiveSheet('search');
  }, []);

  // Close sheet
  const closeSheet = useCallback(() => {
    setActiveSheet('none');
    setSelectedVideoId(null);
    setSelectedUserId(null);
  }, []);

  // Handle upload complete
  const handleUploadComplete = useCallback(() => {
    closeSheet();
    fetchVideos(true);
    toast.success('Video uploaded successfully!');
  }, [closeSheet, fetchVideos]);

  // Handle user click from search
  const handleUserClick = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setActiveSheet('profile');
  }, []);

  // Handle video click from search
  const handleVideoClick = useCallback((videoId: string) => {
    toast.info('Video preview coming soon!');
  }, []);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Main Video Feed */}
      <VideoFeed
        onComment={handleComment}
        onShare={handleShare}
        onAuthorClick={handleAuthorClick}
        className="h-full"
      />

      {/* Header */}
      <Header
        showTabs={true}
        feedType={feedType}
        onFeedTypeChange={setFeedType}
        onSearchClick={handleSearchClick}
      />

      {/* Bottom Navigation */}
      <BottomNav
        activeTab="home"
        onCreateClick={handleCreate}
        onProfileClick={handleProfileClick}
        onInboxClick={handleInboxClick}
      />

      {/* Auth Prompt for non-authenticated users */}
      <AnimatePresence>
        {!isAuthenticated && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 left-4 right-4 z-40 pointer-events-none"
          >
            <div className="bg-gradient-to-r from-cyan-500/20 to-pink-500/20 backdrop-blur-lg border border-white/10 rounded-2xl p-4 max-w-sm mx-auto pointer-events-auto">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-gradient-to-r from-cyan-500 to-pink-500 rounded-lg">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Join TikVibe</h3>
                  <p className="text-xs text-gray-400">Like, comment & share videos</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => showAuthModal('register')}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 h-8 text-xs"
                >
                  Sign Up
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => showAuthModal('login')}
                  className="flex-1 bg-transparent border-white/20 hover:bg-white/10 h-8 text-xs"
                >
                  Sign In
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ad Prompt Modal */}
      <AnimatePresence>
        {showAdPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setShowAdPrompt(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2">Watch Ad to Continue</h3>
              <p className="text-gray-400 text-sm mb-4">
                Watch a short ad to unlock premium features or continue scrolling
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowAdPrompt(false)}
                  className="flex-1"
                >
                  Skip
                </Button>
                <Button
                  onClick={() => {
                    toast.success('Ad rewarded! +10 coins');
                    setShowAdPrompt(false);
                  }}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-pink-500"
                >
                  Watch Ad
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Ad integration point for Kuldnery Hilltop AdNetwork SDK
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments Sheet */}
      <CommentsSheet
        open={activeSheet === 'comments'}
        onOpenChange={(open) => !open && closeSheet()}
        videoId={selectedVideoId}
      />

      {/* Profile Sheet */}
      <ProfileSheet
        open={activeSheet === 'profile'}
        onOpenChange={(open) => !open && closeSheet()}
        userId={selectedUserId}
      />

      {/* Upload Modal */}
      <UploadModal
        open={activeSheet === 'upload'}
        onOpenChange={(open) => !open && closeSheet()}
        onUploadComplete={handleUploadComplete}
      />

      {/* Search Modal */}
      <SearchModal
        open={activeSheet === 'search'}
        onOpenChange={(open) => !open && closeSheet()}
        onUserClick={handleUserClick}
        onVideoClick={handleVideoClick}
      />
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <HomePageContent />
    </AuthProvider>
  );
}
