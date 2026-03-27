import { create } from 'zustand';

// Video type for the store
export interface Video {
  id: string;
  authorId: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  hashtags: string[];
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  duration: number | null;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  status: string;
  isFeatured: boolean;
  isReported: boolean;
  trendingScore: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isVerified: boolean;
  };
  isLiked?: boolean;
}

// Video state interface
interface VideoState {
  videos: Video[];
  currentIndex: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  likedVideos: Set<string>;
  
  // Actions
  setVideos: (videos: Video[]) => void;
  addVideos: (videos: Video[]) => void;
  setCurrentIndex: (index: number) => void;
  setLoading: (loading: boolean) => void;
  setLoadingMore: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setHasMore: (hasMore: boolean) => void;
  
  // Video actions
  fetchVideos: (reset?: boolean) => Promise<void>;
  likeVideo: (videoId: string) => Promise<void>;
  unlikeVideo: (videoId: string) => Promise<void>;
  nextVideo: () => void;
  prevVideo: () => void;
  reset: () => void;
}

// Initial state
const initialState = {
  videos: [],
  currentIndex: 0,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  hasMore: true,
  likedVideos: new Set<string>(),
};

// Create the video store
export const useVideoStore = create<VideoState>()((set, get) => ({
  ...initialState,
  
  // Setters
  setVideos: (videos) => set({ videos }),
  addVideos: (newVideos) => set((state) => ({
    videos: [...state.videos, ...newVideos],
  })),
  setCurrentIndex: (currentIndex) => set({ currentIndex }),
  setLoading: (isLoading) => set({ isLoading }),
  setLoadingMore: (isLoadingMore) => set({ isLoadingMore }),
  setError: (error) => set({ error }),
  setHasMore: (hasMore) => set({ hasMore }),
  
  // Fetch videos
  fetchVideos: async (reset = false) => {
    const state = get();
    
    if (reset) {
      set({ isLoading: true, error: null, videos: [], currentIndex: 0 });
    } else if (state.isLoading || state.isLoadingMore) {
      return;
    } else {
      set({ isLoadingMore: true, error: null });
    }
    
    try {
      const offset = reset ? 0 : state.videos.length;
      const limit = 10;
      
      const response = await fetch(`/api/videos?offset=${offset}&limit=${limit}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch videos');
      }
      
      const data = await response.json();
      const newVideos = data.videos || [];
      
      if (reset) {
        set({
          videos: newVideos,
          currentIndex: 0,
          isLoading: false,
          hasMore: newVideos.length === limit,
        });
      } else {
        set((prevState) => ({
          videos: [...prevState.videos, ...newVideos],
          isLoadingMore: false,
          hasMore: newVideos.length === limit,
        }));
      }
      
      // Initialize liked videos set
      const likedIds = newVideos
        .filter((v: Video) => v.isLiked)
        .map((v: Video) => v.id);
      
      set((prevState) => ({
        likedVideos: new Set([...prevState.likedVideos, ...likedIds]),
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch videos';
      set({
        isLoading: false,
        isLoadingMore: false,
        error: errorMessage,
      });
    }
  },
  
  // Like video
  likeVideo: async (videoId: string) => {
    const state = get();
    const video = state.videos.find((v) => v.id === videoId);
    
    if (!video) return;
    
    // Optimistic update
    set((prevState) => ({
      likedVideos: new Set([...prevState.likedVideos, videoId]),
      videos: prevState.videos.map((v) =>
        v.id === videoId
          ? { ...v, likesCount: v.likesCount + 1, isLiked: true }
          : v
      ),
    }));
    
    try {
      const response = await fetch(`/api/videos/${videoId}/like`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        // Revert on error
        set((prevState) => {
          const newLiked = new Set(prevState.likedVideos);
          newLiked.delete(videoId);
          return {
            likedVideos: newLiked,
            videos: prevState.videos.map((v) =>
              v.id === videoId
                ? { ...v, likesCount: v.likesCount - 1, isLiked: false }
                : v
            ),
          };
        });
      }
    } catch {
      // Revert on error
      set((prevState) => {
        const newLiked = new Set(prevState.likedVideos);
        newLiked.delete(videoId);
        return {
          likedVideos: newLiked,
          videos: prevState.videos.map((v) =>
            v.id === videoId
              ? { ...v, likesCount: v.likesCount - 1, isLiked: false }
              : v
          ),
        };
      });
    }
  },
  
  // Unlike video
  unlikeVideo: async (videoId: string) => {
    const state = get();
    const video = state.videos.find((v) => v.id === videoId);
    
    if (!video) return;
    
    // Optimistic update
    set((prevState) => {
      const newLiked = new Set(prevState.likedVideos);
      newLiked.delete(videoId);
      return {
        likedVideos: newLiked,
        videos: prevState.videos.map((v) =>
          v.id === videoId
            ? { ...v, likesCount: Math.max(0, v.likesCount - 1), isLiked: false }
            : v
        ),
      };
    });
    
    try {
      const response = await fetch(`/api/videos/${videoId}/like`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        // Revert on error
        set((prevState) => ({
          likedVideos: new Set([...prevState.likedVideos, videoId]),
          videos: prevState.videos.map((v) =>
            v.id === videoId
              ? { ...v, likesCount: v.likesCount + 1, isLiked: true }
              : v
          ),
        }));
      }
    } catch {
      // Revert on error
      set((prevState) => ({
        likedVideos: new Set([...prevState.likedVideos, videoId]),
        videos: prevState.videos.map((v) =>
          v.id === videoId
            ? { ...v, likesCount: v.likesCount + 1, isLiked: true }
            : v
        ),
      }));
    }
  },
  
  // Next video
  nextVideo: () => {
    const state = get();
    if (state.currentIndex < state.videos.length - 1) {
      set({ currentIndex: state.currentIndex + 1 });
    }
    
    // Prefetch more videos when nearing the end
    if (state.currentIndex >= state.videos.length - 3 && state.hasMore && !state.isLoadingMore) {
      get().fetchVideos();
    }
  },
  
  // Previous video
  prevVideo: () => {
    const state = get();
    if (state.currentIndex > 0) {
      set({ currentIndex: state.currentIndex - 1 });
    }
  },
  
  // Reset store
  reset: () => set(initialState),
}));
