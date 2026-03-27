'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  User,
  Video,
  Hash,
  CheckCircle2,
  Play,
  X,
  Clock,
  TrendingUp,
  Loader2,
  UserPlus,
  UserCheck,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'

interface SearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserClick?: (userId: string) => void
  onVideoClick?: (videoId: string) => void
  onHashtagClick?: (hashtag: string) => void
}

interface SearchUser {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  isVerified: boolean
  bio: string | null
  followersCount: number
  videosCount: number
  isFollowing?: boolean
}

interface SearchVideo {
  id: string
  videoUrl: string
  thumbnailUrl: string | null
  caption: string | null
  hashtags: string[]
  viewsCount: number
  likesCount: number
  commentsCount: number
  createdAt: string
  author: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
    isVerified: boolean
  }
  isLiked?: boolean
}

interface SearchHashtag {
  id: string
  name: string
  videosCount: number
  createdAt: string
}

interface RecentSearch {
  type: 'user' | 'hashtag'
  id: string
  name: string
  timestamp: number
}

const RECENT_SEARCHES_KEY = 'tiktok-recent-searches'

export function SearchModal({
  open,
  onOpenChange,
  onUserClick,
  onVideoClick,
  onHashtagClick,
}: SearchModalProps) {
  const { user: currentUser } = useAuthStore()
  const inputRef = useRef<HTMLInputElement>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('users')
  const [isLoading, setIsLoading] = useState(false)
  const [users, setUsers] = useState<SearchUser[]>([])
  const [videos, setVideos] = useState<SearchVideo[]>([])
  const [hashtags, setHashtags] = useState<SearchHashtag[]>([])
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
  const [followLoading, setFollowLoading] = useState<string | null>(null)

  // Load recent searches from localStorage
  useEffect(() => {
    if (open) {
      try {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
        if (stored) {
          setRecentSearches(JSON.parse(stored))
        }
      } catch (e) {
        console.error('Failed to load recent searches:', e)
      }
      // Focus input when modal opens
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Save recent search
  const saveRecentSearch = (type: 'user' | 'hashtag', id: string, name: string) => {
    const newSearch: RecentSearch = {
      type,
      id,
      name,
      timestamp: Date.now(),
    }

    const updated = [
      newSearch,
      ...recentSearches.filter((s) => s.id !== id),
    ].slice(0, 10)

    setRecentSearches(updated)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
  }

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem(RECENT_SEARCHES_KEY)
  }

  // Remove single recent search
  const removeRecentSearch = (id: string) => {
    const updated = recentSearches.filter((s) => s.id !== id)
    setRecentSearches(updated)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
  }

  // Search function
  const performSearch = useCallback(
    async (query: string, type: string = 'all') => {
      if (!query.trim()) {
        setUsers([])
        setVideos([])
        setHashtags([])
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&type=${type}`,
          {
            headers: {
              'x-user-id': currentUser?.id || '',
            },
          }
        )

        if (!response.ok) {
          throw new Error('Search failed')
        }

        const data = await response.json()

        if (type === 'all' || type === 'users') {
          setUsers(data.results.users || [])
        }
        if (type === 'all' || type === 'videos') {
          setVideos(data.results.videos || [])
        }
        if (type === 'all' || type === 'hashtags') {
          setHashtags(data.results.hashtags || [])
        }
      } catch (error) {
        console.error('Search error:', error)
        toast.error('Search failed. Please try again.')
      } finally {
        setIsLoading(false)
      }
    },
    [currentUser?.id]
  )

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        const searchType = activeTab === 'all' ? 'all' : activeTab
        performSearch(searchQuery, searchType)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, activeTab, performSearch])

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    if (searchQuery.trim()) {
      performSearch(searchQuery, tab === 'all' ? 'all' : tab)
    }
  }

  // Handle follow/unfollow
  const handleFollowToggle = async (targetUser: SearchUser) => {
    if (!currentUser || followLoading) return

    setFollowLoading(targetUser.id)
    try {
      const isFollowing = targetUser.isFollowing
      const method = isFollowing ? 'DELETE' : 'POST'

      const response = await fetch(`/api/users/${targetUser.id}/follow`, {
        method,
        headers: {
          'x-user-id': currentUser.id,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update follow status')
      }

      // Update user in list
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id
            ? {
                ...u,
                isFollowing: !isFollowing,
                followersCount: isFollowing ? u.followersCount - 1 : u.followersCount + 1,
              }
            : u
        )
      )

      toast.success(isFollowing ? 'Unfollowed' : 'Following')
    } catch (error) {
      console.error('Follow error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update')
    } finally {
      setFollowLoading(null)
    }
  }

  // Format number
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  // Handle user click
  const handleUserClick = (searchUser: SearchUser) => {
    saveRecentSearch('user', searchUser.id, searchUser.username)
    onUserClick?.(searchUser.id)
    onOpenChange(false)
  }

  // Handle video click
  const handleVideoClick = (video: SearchVideo) => {
    onVideoClick?.(video.id)
    onOpenChange(false)
  }

  // Handle hashtag click
  const handleHashtagClick = (hashtag: SearchHashtag) => {
    saveRecentSearch('hashtag', hashtag.id, hashtag.name)
    onHashtagClick?.(hashtag.name)
    onOpenChange(false)
  }

  // Handle recent search click
  const handleRecentClick = (recent: RecentSearch) => {
    if (recent.type === 'user') {
      onUserClick?.(recent.id)
    } else {
      onHashtagClick?.(recent.name)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg w-[95vw] sm:w-full p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-zinc-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              ref={inputRef}
              placeholder="Search users, videos, hashtags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 pl-9 pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full bg-zinc-900 rounded-none border-b border-zinc-800 p-0 h-11">
            <TabsTrigger
              value="users"
              className="flex-1 rounded-none data-[state=active]:border-pink-500 data-[state=active]:border-b-2 data-[state=active]:shadow-none h-full"
            >
              <User className="w-4 h-4 mr-1.5" />
              Users
            </TabsTrigger>
            <TabsTrigger
              value="videos"
              className="flex-1 rounded-none data-[state=active]:border-pink-500 data-[state=active]:border-b-2 data-[state=active]:shadow-none h-full"
            >
              <Video className="w-4 h-4 mr-1.5" />
              Videos
            </TabsTrigger>
            <TabsTrigger
              value="hashtags"
              className="flex-1 rounded-none data-[state=active]:border-pink-500 data-[state=active]:border-b-2 data-[state=active]:shadow-none h-full"
            >
              <Hash className="w-4 h-4 mr-1.5" />
              Hashtags
            </TabsTrigger>
          </TabsList>

          {/* Content */}
          <ScrollArea className="h-[50vh]">
            {/* Loading State */}
            {isLoading && (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full bg-zinc-800" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="w-24 h-4 bg-zinc-800" />
                      <Skeleton className="w-32 h-3 bg-zinc-800" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent Searches (when no query) */}
            {!isLoading && !searchQuery && recentSearches.length > 0 && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-zinc-300">Recent</h3>
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs text-pink-400 hover:text-pink-300"
                  >
                    Clear all
                  </button>
                </div>
                <div className="space-y-2">
                  {recentSearches.map((recent) => (
                    <motion.button
                      key={`${recent.type}-${recent.id}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => handleRecentClick(recent)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                      {recent.type === 'user' ? (
                        <Clock className="w-4 h-4 text-zinc-500" />
                      ) : (
                        <Hash className="w-4 h-4 text-zinc-500" />
                      )}
                      <span className="text-sm">{recent.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeRecentSearch(recent.id)
                        }}
                        className="ml-auto text-zinc-500 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State (when no query and no recent) */}
            {!isLoading && !searchQuery && recentSearches.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
                <Search className="w-12 h-12 mb-3" />
                <p className="text-sm">Search for users, videos, or hashtags</p>
              </div>
            )}

            {/* Users Tab */}
            <TabsContent value="users" className="p-0 m-0">
              {!isLoading && searchQuery && users.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-zinc-400">
                  <p className="text-sm">No users found</p>
                </div>
              )}
              <AnimatePresence>
                {!isLoading && users.length > 0 && (
                  <div className="divide-y divide-zinc-800">
                    {users.map((searchUser, index) => (
                      <motion.div
                        key={searchUser.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3 p-4 hover:bg-zinc-800/50 cursor-pointer"
                        onClick={() => handleUserClick(searchUser)}
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={searchUser.avatarUrl || undefined} />
                          <AvatarFallback className="bg-zinc-700 text-white">
                            {searchUser.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm">
                              {searchUser.displayName || searchUser.username}
                            </span>
                            {searchUser.isVerified && (
                              <CheckCircle2 className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 truncate">
                            @{searchUser.username} • {formatNumber(searchUser.followersCount)} followers
                          </p>
                        </div>
                        {currentUser && currentUser.id !== searchUser.id && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleFollowToggle(searchUser)
                            }}
                            disabled={followLoading === searchUser.id}
                            size="sm"
                            variant={searchUser.isFollowing ? 'outline' : 'default'}
                            className={`h-8 ${
                              searchUser.isFollowing
                                ? 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700'
                                : 'bg-pink-500 hover:bg-pink-600 text-white'
                            }`}
                          >
                            {followLoading === searchUser.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : searchUser.isFollowing ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5 mr-1" />
                                Following
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-3.5 h-3.5 mr-1" />
                                Follow
                              </>
                            )}
                          </Button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </TabsContent>

            {/* Videos Tab */}
            <TabsContent value="videos" className="p-0 m-0">
              {!isLoading && searchQuery && videos.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-zinc-400">
                  <p className="text-sm">No videos found</p>
                </div>
              )}
              {!isLoading && videos.length > 0 && (
                <div className="grid grid-cols-2 gap-1 p-1">
                  {videos.map((video, index) => (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleVideoClick(video)}
                      className="relative aspect-[9/12] bg-zinc-800 rounded overflow-hidden cursor-pointer group"
                    >
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.caption || 'Video'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                          <Video className="w-8 h-8 text-zinc-600" />
                        </div>
                      )}

                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      {/* Stats */}
                      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 text-white text-xs">
                        <div className="flex items-center gap-1">
                          <Play className="w-3 h-3" />
                          {formatNumber(video.viewsCount)}
                        </div>
                        <div className="flex items-center gap-1">
                          <span>❤️</span>
                          {formatNumber(video.likesCount)}
                        </div>
                      </div>

                      {/* Author */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={video.author.avatarUrl || undefined} />
                          <AvatarFallback className="bg-zinc-700 text-white text-[8px]">
                            {video.author.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-white text-xs font-medium">
                          @{video.author.username}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Hashtags Tab */}
            <TabsContent value="hashtags" className="p-0 m-0">
              {!isLoading && searchQuery && hashtags.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-zinc-400">
                  <p className="text-sm">No hashtags found</p>
                </div>
              )}
              <AnimatePresence>
                {!isLoading && hashtags.length > 0 && (
                  <div className="divide-y divide-zinc-800">
                    {hashtags.map((hashtag, index) => (
                      <motion.div
                        key={hashtag.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleHashtagClick(hashtag)}
                        className="flex items-center gap-3 p-4 hover:bg-zinc-800/50 cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                          <Hash className="w-5 h-5 text-pink-500" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">#{hashtag.name}</p>
                          <p className="text-xs text-zinc-400">
                            {formatNumber(hashtag.videosCount)} videos
                          </p>
                        </div>
                        {hashtag.videosCount > 1000 && (
                          <Badge
                            variant="secondary"
                            className="bg-pink-500/20 text-pink-400"
                          >
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Trending
                          </Badge>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
