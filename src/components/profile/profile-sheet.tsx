'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  CheckCircle2,
  Grid3X3,
  Play,
  Heart,
  Settings,
  Edit3,
  UserPlus,
  UserCheck,
  Loader2,
} from 'lucide-react'
import { useAuthStore, type User } from '@/stores/auth-store'
import { toast } from 'sonner'

interface ProfileSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string | null
  onEditProfile?: () => void
}

interface UserProfile extends User {
  isFollowing?: boolean
}

interface UserVideo {
  id: string
  videoUrl: string
  thumbnailUrl: string | null
  caption: string | null
  viewsCount: number
  likesCount: number
  commentsCount: number
  createdAt: string
}

export function ProfileSheet({
  open,
  onOpenChange,
  userId,
  onEditProfile,
}: ProfileSheetProps) {
  const { user: currentUser } = useAuthStore()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [videos, setVideos] = useState<UserVideo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingVideos, setIsLoadingVideos] = useState(false)
  const [isFollowLoading, setIsFollowLoading] = useState(false)
  const [videosPage, setVideosPage] = useState(1)
  const [hasMoreVideos, setHasMoreVideos] = useState(true)

  const isOwnProfile = currentUser?.id === userId

  // Fetch user profile
  const fetchProfile = useCallback(async () => {
    if (!userId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/users/${userId}`, {
        headers: {
          'x-user-id': currentUser?.id || '',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }

      const data = await response.json()
      setProfile(data.user)
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error('Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }, [userId, currentUser?.id])

  // Fetch user videos
  const fetchVideos = useCallback(async (page: number = 1) => {
    if (!userId) return

    setIsLoadingVideos(true)
    try {
      const response = await fetch(
        `/api/users/${userId}/videos?page=${page}&limit=12`,
        {
          headers: {
            'x-user-id': currentUser?.id || '',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch videos')
      }

      const data = await response.json()
      if (page === 1) {
        setVideos(data.videos)
      } else {
        setVideos((prev) => [...prev, ...data.videos])
      }
      setHasMoreVideos(data.pagination.page < data.pagination.totalPages)
    } catch (error) {
      console.error('Error fetching videos:', error)
    } finally {
      setIsLoadingVideos(false)
    }
  }, [userId, currentUser?.id])

  // Load profile when sheet opens
  useEffect(() => {
    if (open && userId) {
      fetchProfile()
      setVideosPage(1)
      fetchVideos(1)
    }
  }, [open, userId, fetchProfile, fetchVideos])

  // Handle follow/unfollow
  const handleFollowToggle = async () => {
    if (!profile || !currentUser) return

    setIsFollowLoading(true)
    try {
      const isFollowing = profile.isFollowing
      const method = isFollowing ? 'DELETE' : 'POST'

      const response = await fetch(`/api/users/${profile.id}/follow`, {
        method,
        headers: {
          'x-user-id': currentUser.id,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update follow status')
      }

      // Update profile state
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              isFollowing: !isFollowing,
              followersCount: isFollowing
                ? prev.followersCount - 1
                : prev.followersCount + 1,
            }
          : null
      )

      toast.success(isFollowing ? 'Unfollowed successfully' : 'Following successfully')
    } catch (error) {
      console.error('Error toggling follow:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update follow status')
    } finally {
      setIsFollowLoading(false)
    }
  }

  // Load more videos
  const loadMoreVideos = () => {
    if (!isLoadingVideos && hasMoreVideos) {
      const nextPage = videosPage + 1
      setVideosPage(nextPage)
      fetchVideos(nextPage)
    }
  }

  // Format numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[90vh] rounded-t-3xl bg-zinc-900 border-zinc-800 text-white px-0"
      >
        {/* Header */}
        <SheetHeader className="px-4 pb-2">
          <SheetTitle className="text-white text-center">Profile</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          // Loading skeleton
          <div className="px-4 py-6 space-y-4">
            <div className="flex flex-col items-center">
              <Skeleton className="w-24 h-24 rounded-full bg-zinc-800" />
              <Skeleton className="w-32 h-5 mt-3 bg-zinc-800" />
              <Skeleton className="w-24 h-4 mt-2 bg-zinc-800" />
            </div>
            <Skeleton className="w-full h-16 bg-zinc-800 rounded-lg" />
            <div className="flex justify-center gap-4">
              <Skeleton className="w-24 h-9 bg-zinc-800 rounded-lg" />
              <Skeleton className="w-24 h-9 bg-zinc-800 rounded-lg" />
            </div>
          </div>
        ) : profile ? (
          <ScrollArea className="h-full">
            <div className="px-4 pb-20">
              {/* Banner */}
              <div className="relative h-28 -mx-4 -mt-2 mb-12">
                {profile.bannerUrl ? (
                  <img
                    src={profile.bannerUrl}
                    alt="Banner"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />
                )}

                {/* Avatar */}
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                  <Avatar className="w-20 h-20 border-4 border-zinc-900">
                    <AvatarImage src={profile.avatarUrl || undefined} />
                    <AvatarFallback className="bg-zinc-700 text-white text-xl">
                      {profile.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>

              {/* User Info */}
              <div className="flex flex-col items-center mt-4">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-lg font-bold">
                    {profile.displayName || profile.username}
                  </h2>
                  {profile.isVerified && (
                    <CheckCircle2 className="w-5 h-5 text-blue-500" />
                  )}
                </div>
                <p className="text-zinc-400 text-sm">@{profile.username}</p>

                {profile.bio && (
                  <p className="text-sm text-zinc-300 mt-3 text-center max-w-xs">
                    {profile.bio}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="flex justify-center gap-6 mt-4">
                <div className="text-center">
                  <p className="text-lg font-bold">{formatNumber(profile.followingCount)}</p>
                  <p className="text-xs text-zinc-400">Following</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{formatNumber(profile.followersCount)}</p>
                  <p className="text-xs text-zinc-400">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{formatNumber(profile.likesCount)}</p>
                  <p className="text-xs text-zinc-400">Likes</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-3 mt-4">
                {isOwnProfile ? (
                  <>
                    <Button
                      variant="outline"
                      className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                      onClick={onEditProfile}
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit profile
                    </Button>
                    <Button
                      variant="outline"
                      className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={handleFollowToggle}
                      disabled={isFollowLoading}
                      className={`min-w-[120px] ${
                        profile.isFollowing
                          ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                          : 'bg-pink-500 hover:bg-pink-600 text-white'
                      }`}
                    >
                      {isFollowLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : profile.isFollowing ? (
                        <>
                          <UserCheck className="w-4 h-4 mr-2" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Follow
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>

              {/* Tabs */}
              <div className="mt-6">
                <div className="flex border-b border-zinc-800">
                  <button
                    className="flex-1 py-3 text-white border-b-2 border-pink-500 flex items-center justify-center gap-2"
                  >
                    <Grid3X3 className="w-4 h-4" />
                    Videos
                  </button>
                  <button
                    className="flex-1 py-3 text-zinc-400 flex items-center justify-center gap-2"
                  >
                    <Heart className="w-4 h-4" />
                    Liked
                  </button>
                </div>

                {/* Video Grid */}
                <div className="mt-4 grid grid-cols-3 gap-1">
                  <AnimatePresence>
                    {videos.map((video, index) => (
                      <motion.div
                        key={video.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="relative aspect-[9/12] bg-zinc-800 rounded overflow-hidden group cursor-pointer"
                      >
                        {video.thumbnailUrl ? (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.caption || 'Video'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                            <Play className="w-8 h-8 text-zinc-600" />
                          </div>
                        )}

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-10 h-10 text-white" />
                        </div>

                        {/* Stats */}
                        <div className="absolute bottom-1 left-1 right-1 flex items-center gap-1.5 text-white text-xs">
                          <Play className="w-3 h-3" />
                          <span>{formatNumber(video.viewsCount)}</span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Loading more indicator */}
                  {isLoadingVideos && (
                    <div className="col-span-3 flex justify-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                    </div>
                  )}

                  {/* Load more trigger */}
                  {hasMoreVideos && !isLoadingVideos && videos.length > 0 && (
                    <div className="col-span-3 flex justify-center py-4">
                      <Button
                        variant="ghost"
                        onClick={loadMoreVideos}
                        className="text-zinc-400 hover:text-white"
                      >
                        Load more
                      </Button>
                    </div>
                  )}

                  {/* Empty state */}
                  {!isLoadingVideos && videos.length === 0 && (
                    <div className="col-span-3 flex flex-col items-center justify-center py-12 text-zinc-400">
                      <Grid3X3 className="w-12 h-12 mb-2" />
                      <p className="text-sm">No videos yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        ) : (
          // Error state
          <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
            <p>Failed to load profile</p>
            <Button
              variant="ghost"
              onClick={fetchProfile}
              className="mt-2 text-pink-500"
            >
              Try again
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
