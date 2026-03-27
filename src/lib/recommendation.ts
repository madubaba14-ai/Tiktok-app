import { db } from './db';

/**
 * Video stats for trending calculation
 */
interface VideoStats {
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: Date;
  publishedAt: Date | null;
}

/**
 * Weights for trending score calculation
 */
const WEIGHTS = {
  views: 0.3,      // Views contribute 30%
  likes: 0.35,     // Likes contribute 35% 
  comments: 0.2,   // Comments contribute 20%
  shares: 0.15,    // Shares contribute 15%
};

/**
 * Time decay factor - how quickly scores decay over time
 * Higher values = slower decay
 */
const TIME_DECAY_FACTOR = 0.5;

/**
 * Calculate trending score for a video
 * 
 * Formula: (weighted_engagement * time_decay)
 * - weighted_engagement = normalized views, likes, comments, shares
 * - time_decay = 1 / (1 + hours_since_publish ^ decay_factor)
 */
export function calculateTrendingScore(stats: VideoStats): number {
  const now = new Date();
  const publishDate = stats.publishedAt || stats.createdAt;
  const hoursSincePublish = (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60);
  
  // Time decay: newer videos get higher scores
  // Using exponential decay formula
  const timeDecay = 1 / (1 + Math.pow(hoursSincePublish, TIME_DECAY_FACTOR));
  
  // Calculate engagement score
  // Use logarithmic scaling to prevent viral videos from dominating
  const logViews = stats.viewsCount > 0 ? Math.log10(stats.viewsCount + 1) : 0;
  const logLikes = stats.likesCount > 0 ? Math.log10(stats.likesCount + 1) : 0;
  const logComments = stats.commentsCount > 0 ? Math.log10(stats.commentsCount + 1) : 0;
  const logShares = stats.sharesCount > 0 ? Math.log10(stats.sharesCount + 1) : 0;
  
  // Weighted engagement score
  const engagementScore = 
    (logViews * WEIGHTS.views) +
    (logLikes * WEIGHTS.likes) +
    (logComments * WEIGHTS.comments) +
    (logShares * WEIGHTS.shares);
  
  // Final score combines engagement with time decay
  const trendingScore = engagementScore * timeDecay;
  
  return Math.round(trendingScore * 1000) / 1000; // Round to 3 decimal places
}

/**
 * Update trending score for a specific video
 */
export async function updateVideoTrendingScore(videoId: string): Promise<void> {
  const video = await db.video.findUnique({
    where: { id: videoId },
    select: {
      viewsCount: true,
      likesCount: true,
      commentsCount: true,
      sharesCount: true,
      createdAt: true,
      publishedAt: true,
    },
  });
  
  if (!video) return;
  
  const trendingScore = calculateTrendingScore(video);
  
  await db.video.update({
    where: { id: videoId },
    data: { trendingScore },
  });
}

/**
 * Batch update trending scores for all videos
 * Should be run periodically (e.g., every hour)
 */
export async function updateAllTrendingScores(): Promise<void> {
  const videos = await db.video.findMany({
    where: {
      status: 'PUBLISHED',
    },
    select: {
      id: true,
      viewsCount: true,
      likesCount: true,
      commentsCount: true,
      sharesCount: true,
      createdAt: true,
      publishedAt: true,
    },
  });
  
  for (const video of videos) {
    const trendingScore = calculateTrendingScore(video);
    await db.video.update({
      where: { id: video.id },
      data: { trendingScore },
    });
  }
}

/**
 * Get trending videos with pagination
 */
export async function getTrendingVideos(options: {
  limit?: number;
  cursor?: string;
  minViews?: number;
} = {}) {
  const { limit = 20, cursor, minViews = 0 } = options;
  
  const videos = await db.video.findMany({
    where: {
      status: 'PUBLISHED',
      viewsCount: { gte: minViews },
      ...(cursor && {
        id: { lt: cursor },
      }),
    },
    orderBy: [
      { trendingScore: 'desc' },
      { createdAt: 'desc' },
    ],
    take: limit,
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          isVerified: true,
        },
      },
    },
  });
  
  return videos;
}

/**
 * Get personalized feed for a user
 * Combines trending videos with user preferences
 */
export async function getPersonalizedFeed(options: {
  userId?: string;
  limit?: number;
  cursor?: string;
} = {}) {
  const { userId, limit = 20, cursor } = options;
  
  // If no user, return trending videos
  if (!userId) {
    return getTrendingVideos({ limit, cursor });
  }
  
  // Get user's liked videos to understand preferences
  const likedVideos = await db.like.findMany({
    where: { userId },
    select: {
      video: {
        select: {
          hashtags: true,
        },
      },
    },
    take: 50,
    orderBy: { createdAt: 'desc' },
  });
  
  // Extract hashtags from liked videos
  const preferredHashtags = new Set<string>();
  for (const like of likedVideos) {
    try {
      const tags = JSON.parse(like.video.hashtags) as string[];
      tags.forEach(tag => preferredHashtags.add(tag));
    } catch {
      // Skip invalid JSON
    }
  }
  
  // Get user's followed authors
  const following = await db.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followingIds = following.map(f => f.followingId);
  
  // Build query with preferences
  // Priority: 
  // 1. Videos from followed creators
  // 2. Videos with preferred hashtags
  // 3. Trending videos
  
  const videos = await db.video.findMany({
    where: {
      status: 'PUBLISHED',
      ...(cursor && {
        id: { lt: cursor },
      }),
    },
    orderBy: [
      { trendingScore: 'desc' },
      { createdAt: 'desc' },
    ],
    take: limit * 2, // Get more to filter
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          isVerified: true,
        },
      },
    },
  });
  
  // Score videos based on user preferences
  const scoredVideos = videos.map(video => {
    let score = video.trendingScore;
    
    // Boost score for followed creators
    if (followingIds.includes(video.authorId)) {
      score += 5;
    }
    
    // Boost score for preferred hashtags
    try {
      const videoTags = JSON.parse(video.hashtags) as string[];
      for (const tag of videoTags) {
        if (preferredHashtags.has(tag)) {
          score += 0.5;
        }
      }
    } catch {
      // Skip invalid JSON
    }
    
    return { ...video, personalizedScore: score };
  });
  
  // Sort by personalized score and return top results
  scoredVideos.sort((a, b) => b.personalizedScore - a.personalizedScore);
  
  // Remove the temporary score field
  const result = scoredVideos.slice(0, limit).map(({ personalizedScore: _, ...video }) => video);
  
  return result;
}

/**
 * Get recommended videos similar to a given video
 */
export async function getSimilarVideos(videoId: string, limit: number = 10) {
  // Get the source video's hashtags
  const sourceVideo = await db.video.findUnique({
    where: { id: videoId },
    select: { hashtags: true, authorId: true },
  });
  
  if (!sourceVideo) return [];
  
  let sourceHashtags: string[] = [];
  try {
    sourceHashtags = JSON.parse(sourceVideo.hashtags) as string[];
  } catch {
    // No valid hashtags
  }
  
  // Find videos with similar hashtags or from the same author
  const videos = await db.video.findMany({
    where: {
      id: { not: videoId },
      status: 'PUBLISHED',
      OR: [
        { authorId: sourceVideo.authorId },
      ],
    },
    orderBy: [
      { trendingScore: 'desc' },
      { createdAt: 'desc' },
    ],
    take: limit,
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          isVerified: true,
        },
      },
    },
  });
  
  // Score by hashtag overlap
  const scoredVideos = videos.map(video => {
    let score = video.trendingScore;
    
    try {
      const videoTags = JSON.parse(video.hashtags) as string[];
      const overlap = videoTags.filter(tag => sourceHashtags.includes(tag)).length;
      score += overlap * 0.5;
    } catch {
      // Skip invalid JSON
    }
    
    return { ...video, similarityScore: score };
  });
  
  scoredVideos.sort((a, b) => b.similarityScore - a.similarityScore);
  
  return scoredVideos.slice(0, limit).map(({ similarityScore: _, ...video }) => video);
}
