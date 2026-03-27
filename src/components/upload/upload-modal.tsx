'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Upload,
  Video,
  X,
  Play,
  Pause,
  Hash,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'

interface UploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadComplete?: () => void
}

interface UploadState {
  file: File | null
  preview: string | null
  caption: string
  hashtags: string[]
  currentHashtag: string
  uploadProgress: number
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error'
  errorMessage: string
}

export function UploadModal({
  open,
  onOpenChange,
  onUploadComplete,
}: UploadModalProps) {
  const { user } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const [state, setState] = useState<UploadState>({
    file: null,
    preview: null,
    caption: '',
    hashtags: [],
    currentHashtag: '',
    uploadProgress: 0,
    uploadStatus: 'idle',
    errorMessage: '',
  })

  const [isPlaying, setIsPlaying] = useState(false)

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file')
      return
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('Video must be less than 100MB')
      return
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file)

    setState((prev) => ({
      ...prev,
      file,
      preview: previewUrl,
      uploadStatus: 'idle',
      uploadProgress: 0,
      errorMessage: '',
    }))
  }

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]

    if (!file) return

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file')
      return
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error('Video must be less than 100MB')
      return
    }

    const previewUrl = URL.createObjectURL(file)

    setState((prev) => ({
      ...prev,
      file,
      preview: previewUrl,
      uploadStatus: 'idle',
      uploadProgress: 0,
      errorMessage: '',
    }))
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // Toggle video play/pause
  const toggleVideoPlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  // Remove video
  const removeVideo = () => {
    if (state.preview) {
      URL.revokeObjectURL(state.preview)
    }
    setState((prev) => ({
      ...prev,
      file: null,
      preview: null,
      uploadStatus: 'idle',
      uploadProgress: 0,
    }))
    setIsPlaying(false)
  }

  // Add hashtag
  const addHashtag = () => {
    const tag = state.currentHashtag.trim().replace(/^#/, '')
    if (!tag) return

    if (state.hashtags.includes(tag)) {
      toast.error('Hashtag already added')
      return
    }

    if (state.hashtags.length >= 10) {
      toast.error('Maximum 10 hashtags allowed')
      return
    }

    setState((prev) => ({
      ...prev,
      hashtags: [...prev.hashtags, tag],
      currentHashtag: '',
    }))
  }

  // Remove hashtag
  const removeHashtag = (tag: string) => {
    setState((prev) => ({
      ...prev,
      hashtags: prev.hashtags.filter((t) => t !== tag),
    }))
  }

  // Handle hashtag input key press
  const handleHashtagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      addHashtag()
    }
  }

  // Upload video
  const uploadVideo = async () => {
    if (!state.file || !user) return

    setState((prev) => ({
      ...prev,
      uploadStatus: 'uploading',
      uploadProgress: 0,
      errorMessage: '',
    }))

    try {
      const formData = new FormData()
      formData.append('video', state.file)
      formData.append('caption', state.caption)
      formData.append('hashtags', JSON.stringify(state.hashtags))

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setState((prev) => ({
          ...prev,
          uploadProgress: Math.min(prev.uploadProgress + 10, 90),
        }))
      }, 200)

      const response = await fetch('/api/videos', {
        method: 'POST',
        headers: {
          'x-user-id': user.id,
        },
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to upload video')
      }

      setState((prev) => ({
        ...prev,
        uploadProgress: 100,
        uploadStatus: 'success',
      }))

      toast.success('Video uploaded successfully!')

      // Reset and close after success
      setTimeout(() => {
        onOpenChange(false)
        onUploadComplete?.()
        resetState()
      }, 1500)
    } catch (error) {
      setState((prev) => ({
        ...prev,
        uploadStatus: 'error',
        uploadProgress: 0,
        errorMessage: error instanceof Error ? error.message : 'Upload failed',
      }))
      toast.error('Failed to upload video')
    }
  }

  // Reset state
  const resetState = () => {
    if (state.preview) {
      URL.revokeObjectURL(state.preview)
    }
    setState({
      file: null,
      preview: null,
      caption: '',
      hashtags: [],
      currentHashtag: '',
      uploadProgress: 0,
      uploadStatus: 'idle',
      errorMessage: '',
    })
    setIsPlaying(false)
  }

  // Handle dialog close
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetState()
    }
    onOpenChange(open)
  }

  const canUpload = state.file && state.uploadStatus !== 'uploading'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="text-center">Upload Video</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Video Upload Area */}
          {!state.preview ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative"
            >
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-zinc-700 rounded-xl cursor-pointer hover:border-pink-500 hover:bg-zinc-800/50 transition-colors"
              >
                <Video className="w-12 h-12 text-zinc-500 mb-3" />
                <p className="text-zinc-400 text-sm mb-1">
                  Drag and drop a video or click to browse
                </p>
                <p className="text-zinc-500 text-xs">
                  MP4, MOV, AVI (max 100MB)
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </motion.div>
          ) : (
            // Video Preview
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative"
            >
              <div className="relative aspect-[9/16] sm:aspect-video bg-zinc-800 rounded-xl overflow-hidden">
                <video
                  ref={videoRef}
                  src={state.preview}
                  className="w-full h-full object-contain"
                  onEnded={() => setIsPlaying(false)}
                />

                {/* Play/Pause Overlay */}
                <div
                  onClick={toggleVideoPlay}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer"
                >
                  <motion.div
                    initial={{ scale: 1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 text-white" />
                    ) : (
                      <Play className="w-6 h-6 text-white ml-0.5" />
                    )}
                  </motion.div>
                </div>

                {/* Remove Button */}
                <button
                  onClick={removeVideo}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* File Info */}
              <div className="flex items-center gap-2 mt-2 text-zinc-400 text-xs">
                <Video className="w-4 h-4" />
                <span>{state.file?.name}</span>
                <span>•</span>
                <span>
                  {((state.file?.size || 0) / (1024 * 1024)).toFixed(1)} MB
                </span>
              </div>
            </motion.div>
          )}

          {/* Caption Input */}
          {state.preview && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <Textarea
                placeholder="Write a caption..."
                value={state.caption}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, caption: e.target.value }))
                }
                maxLength={2200}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none min-h-[80px]"
              />
              <div className="text-xs text-zinc-500 text-right">
                {state.caption.length}/2200
              </div>
            </motion.div>
          )}

          {/* Hashtags */}
          {state.preview && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder="Add hashtag"
                    value={state.currentHashtag}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        currentHashtag: e.target.value,
                      }))
                    }
                    onKeyDown={handleHashtagKeyPress}
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 pl-9"
                  />
                </div>
                <Button
                  onClick={addHashtag}
                  variant="outline"
                  className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                >
                  Add
                </Button>
              </div>

              {/* Hashtag Chips */}
              {state.hashtags.length > 0 && (
                <ScrollArea className="w-full">
                  <div className="flex flex-wrap gap-2 mt-2">
                    <AnimatePresence>
                      {state.hashtags.map((tag) => (
                        <motion.div
                          key={tag}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                        >
                          <Badge
                            variant="secondary"
                            className="bg-zinc-800 text-pink-400 hover:bg-zinc-700 pr-1"
                          >
                            #{tag}
                            <button
                              onClick={() => removeHashtag(tag)}
                              className="ml-1 p-0.5 rounded-full hover:bg-zinc-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              )}
            </motion.div>
          )}

          {/* Upload Progress */}
          {state.uploadStatus === 'uploading' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Uploading...</span>
                <span className="text-white">{state.uploadProgress}%</span>
              </div>
              <Progress value={state.uploadProgress} className="h-2" />
            </motion.div>
          )}

          {/* Success State */}
          {state.uploadStatus === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-4"
            >
              <CheckCircle2 className="w-12 h-12 text-green-500 mb-2" />
              <p className="text-white font-medium">Upload Complete!</p>
            </motion.div>
          )}

          {/* Error State */}
          {state.uploadStatus === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
            >
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-400 text-sm">{state.errorMessage}</p>
            </motion.div>
          )}

          {/* Upload Button */}
          {state.preview && state.uploadStatus !== 'success' && (
            <Button
              onClick={uploadVideo}
              disabled={!canUpload}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white"
            >
              {state.uploadStatus === 'uploading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Video
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
