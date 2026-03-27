'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Heart,
  MessageCircle,
  Send,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface CommentsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  videoId: string | null
}

interface CommentUser {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  isVerified: boolean
}

interface Reply {
  id: string
  content: string
  likesCount: number
  createdAt: string
  updatedAt: string
  user: CommentUser
  parentId: string
}

interface Comment {
  id: string
  content: string
  likesCount: number
  createdAt: string
  updatedAt: string
  user: CommentUser
  repliesCount: number
  replies: Reply[]
}

export function CommentsSheet({
  open,
  onOpenChange,
  videoId,
}: CommentsSheetProps) {
  const { user } = useAuthStore()
  const inputRef = useRef<HTMLInputElement>(null)

  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [commentInput, setCommentInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Comment | Reply | null>(null)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set())

  // Fetch comments
  const fetchComments = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (!videoId) return

      if (append) {
        setIsLoadingMore(true)
      } else {
        setIsLoading(true)
      }

      try {
        const response = await fetch(
          `/api/videos/${videoId}/comments?page=${page}&limit=20`,
          {
            headers: {
              'x-user-id': user?.id || '',
            },
          }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch comments')
        }

        const data = await response.json()

        if (append) {
          setComments((prev) => [...prev, ...data.comments])
        } else {
          setComments(data.comments)
        }

        setCurrentPage(data.pagination.page)
        setTotalPages(data.pagination.totalPages)
      } catch (error) {
        console.error('Error fetching comments:', error)
        toast.error('Failed to load comments')
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
      },
    [videoId, user?.id]
  )

  // Load comments when sheet opens
  useEffect(() => {
    if (open && videoId) {
      setComments([])
      setCurrentPage(1)
      fetchComments(1)
    }
  }, [open, videoId, fetchComments])

  // Load more comments
  const loadMoreComments = () => {
    if (!isLoadingMore && currentPage < totalPages) {
      fetchComments(currentPage + 1, true)
    }
  }

  // Submit comment
  const submitComment = async () => {
    if (!commentInput.trim() || !videoId || !user || isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/videos/${videoId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          content: commentInput.trim(),
          parentId: replyingTo?.id || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to post comment')
      }

      const data = await response.json()

      if (replyingTo) {
        // Add reply to the comment
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === replyingTo.id || c.id === (replyingTo as Reply).parentId) {
              return {
                ...c,
                repliesCount: c.repliesCount + 1,
                replies: [...c.replies, data.comment],
              }
            }
            return c
          })
        )
        setReplyingTo(null)
      } else {
        // Add new comment to the top
        setComments((prev) => [data.comment, ...prev])
      }

      setCommentInput('')
      toast.success('Comment posted!')
    } catch (error) {
      console.error('Error posting comment:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to post comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle expanded replies
  const toggleReplies = (commentId: string) => {
    setExpandedComments((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(commentId)) {
        newSet.delete(commentId)
      } else {
        newSet.add(commentId)
      }
      return newSet
    })
  }

  // Start replying
  const startReplying = (comment: Comment | Reply) => {
    setReplyingTo(comment)
    inputRef.current?.focus()
  }

  // Cancel reply
  const cancelReply = () => {
    setReplyingTo(null)
    setCommentInput('')
  }

  // Like comment (simulated - would need a separate API endpoint)
  const toggleLikeComment = (commentId: string) => {
    setLikedComments((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(commentId)) {
        newSet.delete(commentId)
      } else {
        newSet.add(commentId)
      }
      return newSet
    })
  }

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return ''
    }
  }

  // Render comment item
  const renderComment = (comment: Comment, isReply: boolean = false) => {
    const isLiked = likedComments.has(comment.id)
    const isExpanded = expandedComments.has(comment.id)

    return (
      <motion.div
        key={comment.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${isReply ? 'ml-10 mt-2' : 'py-3'}`}
      >
        <div className="flex gap-3">
          {/* Avatar */}
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={comment.user.avatarUrl || undefined} />
            <AvatarFallback className="bg-zinc-700 text-white text-xs">
              {comment.user.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* Comment Content */}
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm text-white">
                    {comment.user.displayName || comment.user.username}
                  </span>
                  {comment.user.isVerified && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                  )}
                </div>
                <p className="text-sm text-zinc-300 mt-0.5">{comment.content}</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500">
                  <span>{formatDate(comment.createdAt)}</span>
                  <button
                    onClick={() => toggleLikeComment(comment.id)}
                    className={`hover:text-pink-400 ${isLiked ? 'text-pink-500' : ''}`}
                  >
                    {isLiked ? 'Liked' : 'Like'}
                  </button>
                  {!isReply && (
                    <button
                      onClick={() => startReplying(comment)}
                      className="hover:text-white"
                    >
                      Reply
                    </button>
                  )}
                </div>
              </div>

              {/* Like Button */}
              <button
                onClick={() => toggleLikeComment(comment.id)}
                className="flex flex-col items-center gap-0.5"
              >
                <Heart
                  className={`w-4 h-4 ${
                    isLiked ? 'fill-pink-500 text-pink-500' : 'text-zinc-400'
                  }`}
                />
                {(comment.likesCount > 0 || isLiked) && (
                  <span className="text-xs text-zinc-400">
                    {comment.likesCount + (isLiked ? 1 : 0)}
                  </span>
                )}
              </button>
            </div>

            {/* Replies Toggle */}
            {'repliesCount' in comment && comment.repliesCount > 0 && (
              <button
                onClick={() => toggleReplies(comment.id)}
                className="flex items-center gap-1 text-pink-400 text-xs mt-2 hover:text-pink-300"
              >
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                {comment.repliesCount}{' '}
                {comment.repliesCount === 1 ? 'reply' : 'replies'}
              </button>
            )}

            {/* Nested Replies */}
            {'replies' in comment && isExpanded && comment.replies.length > 0 && (
              <div className="mt-2">
                {comment.replies.map((reply) => renderComment(reply as Comment, true))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[70vh] rounded-t-3xl bg-zinc-900 border-zinc-800 text-white px-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-4 pb-3 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-white text-base">
              Comments {comments.length > 0 && `(${comments.length})`}
            </SheetTitle>
          </div>
        </SheetHeader>

        {/* Comments List */}
        <ScrollArea className="flex-1 px-4">
          {isLoading ? (
            // Loading skeleton
            <div className="space-y-4 py-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-8 h-8 rounded-full bg-zinc-800" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="w-24 h-4 bg-zinc-800" />
                    <Skeleton className="w-full h-4 bg-zinc-800" />
                    <Skeleton className="w-16 h-3 bg-zinc-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length > 0 ? (
            <div className="divide-y divide-zinc-800">
              <AnimatePresence>
                {comments.map((comment) => renderComment(comment))}
              </AnimatePresence>

              {/* Load More */}
              {currentPage < totalPages && (
                <div className="py-4 flex justify-center">
                  <Button
                    variant="ghost"
                    onClick={loadMoreComments}
                    disabled={isLoadingMore}
                    className="text-zinc-400 hover:text-white"
                  >
                    {isLoadingMore ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <ChevronDown className="w-4 h-4 mr-2" />
                    )}
                    Load more comments
                  </Button>
                </div>
              )}
            </div>
          ) : (
            // Empty state
            <div className="flex flex-col items-center justify-center h-full text-zinc-400">
              <MessageCircle className="w-12 h-12 mb-3" />
              <p className="text-sm font-medium">No comments yet</p>
              <p className="text-xs mt-1">Be the first to comment!</p>
            </div>
          )}
        </ScrollArea>

        {/* Reply indicator */}
        {replyingTo && (
          <div className="px-4 py-2 bg-zinc-800/50 border-t border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span>Replying to</span>
              <span className="text-pink-400">
                @{(replyingTo as Comment).user?.username}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={cancelReply}
              className="text-zinc-400 hover:text-white h-7 px-2"
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Comment Input */}
        <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.avatarUrl || undefined} />
              <AvatarFallback className="bg-zinc-700 text-white text-xs">
                {user?.username?.slice(0, 2).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'}
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    submitComment()
                  }
                }}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 pr-10"
              />
              <Button
                onClick={submitComment}
                disabled={!commentInput.trim() || isSubmitting}
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-pink-500 hover:text-pink-400 hover:bg-transparent"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
