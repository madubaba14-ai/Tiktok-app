import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

// Sample video URLs - using public domain videos
const sampleVideos = [
  {
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg',
    caption: 'Fire up your day! 🔥 #motivation #fire #blaze',
    hashtags: ['motivation', 'fire', 'blaze'],
  },
  {
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnailUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerEscapes.jpg',
    caption: 'Adventure awaits! 🌍 #travel #adventure #explore',
    hashtags: ['travel', 'adventure', 'explore'],
  },
  {
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnailUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerFun.jpg',
    caption: 'Having the best time! 😄 #fun #happy #vibes',
    hashtags: ['fun', 'happy', 'vibes'],
  },
  {
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    thumbnailUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerJoyrides.jpg',
    caption: 'Road trip vibes! 🚗 #roadtrip #joyride #adventure',
    hashtags: ['roadtrip', 'joyride', 'adventure'],
  },
  {
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    thumbnailUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerMeltdowns.jpg',
    caption: 'When life gets too much 😅 #relatable #funny #viral',
    hashtags: ['relatable', 'funny', 'viral'],
  },
  {
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    thumbnailUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg',
    caption: 'Epic animation journey! ✨ #animation #art #creative',
    hashtags: ['animation', 'art', 'creative'],
  },
  {
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
    thumbnailUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/SubaruOutbackOnStreetAndDirt.jpg',
    caption: 'Off-road adventures! 🏔️ #cars #offroad #nature',
    hashtags: ['cars', 'offroad', 'nature'],
  },
  {
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    thumbnailUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/TearsOfSteel.jpg',
    caption: 'Robot drama! 🤖 #scifi #film #techofsteele',
    hashtags: ['scifi', 'film', 'techofsteele'],
  },
  {
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
    thumbnailUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/VolkswagenGTIReview.jpg',
    caption: 'Car review time! 🚙 #cars #review #volkswagen',
    hashtags: ['cars', 'review', 'volkswagen'],
  },
  {
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    thumbnailUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/WeAreGoingOnBullrun.jpg',
    caption: 'Bull run adventure! 🏃 #exciting #adventure #travel',
    hashtags: ['exciting', 'adventure', 'travel'],
  },
  {
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
    thumbnailUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/WhatCarCanYouGetForAGrand.jpg',
    caption: 'Budget car hunting! 💰 #cars #budget #tips',
    hashtags: ['cars', 'budget', 'tips'],
  },
  {
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnailUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg',
    caption: 'Big Buck Bunny animation! 🐰 #animation #funny #bunny',
    hashtags: ['animation', 'funny', 'bunny'],
  },
];

const users = [
  {
    username: 'creativejess',
    displayName: 'Jessica Chen',
    bio: 'Content creator | Travel enthusiast 🌍✨\nDM for collabs 👇',
    email: 'jessica@example.com',
    password: 'password123',
    isVerified: true,
  },
  {
    username: 'techmike',
    displayName: 'Mike Tech',
    bio: 'Tech reviews & tutorials 💻\nHelping you make better choices',
    email: 'mike@example.com',
    password: 'password123',
    isVerified: true,
  },
  {
    username: 'dancequeen',
    displayName: 'Sarah Moves',
    bio: 'Professional dancer 💃\nTeaching you the latest moves!',
    email: 'sarah@example.com',
    password: 'password123',
    isVerified: false,
  },
  {
    username: 'foodie_adventures',
    displayName: 'Chef Marco',
    bio: 'Exploring world cuisines 🍜🍕\nEasy recipes every day!',
    email: 'marco@example.com',
    password: 'password123',
    isVerified: true,
  },
  {
    username: 'comedy_central',
    displayName: 'Jake Laughs',
    bio: 'Making you smile daily 😄\nStand-up comedian',
    email: 'jake@example.com',
    password: 'password123',
    isVerified: false,
  },
  {
    username: 'fitness_guru',
    displayName: 'Alex Strong',
    bio: 'Personal trainer 💪\nTransform your body, transform your life',
    email: 'alex@example.com',
    password: 'password123',
    isVerified: true,
  },
];

async function main() {
  console.log('Starting seed...');

  // Create users
  console.log('Creating users...');
  const createdUsers = [];
  for (const userData of users) {
    const passwordHash = await hash(userData.password, 12);
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        username: userData.username,
        displayName: userData.displayName,
        bio: userData.bio,
        passwordHash,
        isVerified: userData.isVerified,
        followersCount: Math.floor(Math.random() * 50000) + 1000,
        followingCount: Math.floor(Math.random() * 500) + 50,
        likesCount: Math.floor(Math.random() * 100000) + 5000,
        videosCount: Math.floor(Math.random() * 50) + 10,
      },
    });
    createdUsers.push(user);
    console.log(`Created user: ${user.username}`);
  }

  // Create videos
  console.log('Creating videos...');
  for (let i = 0; i < sampleVideos.length; i++) {
    const videoData = sampleVideos[i];
    const author = createdUsers[i % createdUsers.length];
    
    const viewsCount = Math.floor(Math.random() * 500000) + 10000;
    const likesCount = Math.floor(Math.random() * 50000) + 1000;
    const commentsCount = Math.floor(Math.random() * 500) + 50;
    const sharesCount = Math.floor(Math.random() * 1000) + 100;
    
    // Calculate trending score
    const trendingScore = (viewsCount * 0.3) + (likesCount * 2) + (commentsCount * 5) + (sharesCount * 10);
    
    const video = await prisma.video.create({
      data: {
        authorId: author.id,
        videoUrl: videoData.videoUrl,
        thumbnailUrl: videoData.thumbnailUrl,
        caption: videoData.caption,
        hashtags: JSON.stringify(videoData.hashtags),
        viewsCount,
        likesCount,
        commentsCount,
        sharesCount,
        duration: Math.floor(Math.random() * 60) + 15,
        status: 'PUBLISHED',
        trendingScore,
        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      },
    });
    console.log(`Created video: ${video.id}`);
  }

  // Create some follow relationships
  console.log('Creating follow relationships...');
  for (let i = 0; i < createdUsers.length; i++) {
    for (let j = 0; j < createdUsers.length; j++) {
      if (i !== j && Math.random() > 0.5) {
        await prisma.follow.create({
          data: {
            followerId: createdUsers[i].id,
            followingId: createdUsers[j].id,
          },
        });
      }
    }
  }

  // Create some likes
  console.log('Creating likes...');
  const videos = await prisma.video.findMany();
  for (const user of createdUsers) {
    for (const video of videos) {
      if (video.authorId !== user.id && Math.random() > 0.7) {
        await prisma.like.create({
          data: {
            userId: user.id,
            videoId: video.id,
          },
        });
      }
    }
  }

  // Create some comments
  console.log('Creating comments...');
  const commentTexts = [
    'This is amazing! 🔥',
    'Love this content! Keep it up! 💪',
    'So inspiring! 😍',
    'Best video I\'ve seen today!',
    'Can\'t stop watching this! 🎬',
    'This made my day! ❤️',
    'Incredible work! 👏',
    'How do you do it?! 🤯',
    'Sharing this with everyone!',
    'You deserve more views! 🌟',
  ];

  for (const user of createdUsers) {
    for (const video of videos) {
      if (video.authorId !== user.id && Math.random() > 0.6) {
        await prisma.comment.create({
          data: {
            videoId: video.id,
            userId: user.id,
            content: commentTexts[Math.floor(Math.random() * commentTexts.length)],
          },
        });
      }
    }
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
