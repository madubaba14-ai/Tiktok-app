'use client';

import { motion } from 'framer-motion';
import { Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type FeedType = 'foryou' | 'following';

interface HeaderProps {
  showTabs?: boolean;
  onFeedTypeChange?: (type: FeedType) => void;
  feedType?: FeedType;
  onSearchClick?: () => void;
}

export function Header({ 
  showTabs = true, 
  onFeedTypeChange, 
  feedType = 'foryou',
  onSearchClick,
}: HeaderProps) {
  const handleFeedTypeChange = (type: FeedType) => {
    onFeedTypeChange?.(type);
  };

  const handleSearch = () => {
    onSearchClick?.();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Background with blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      
      {/* Content */}
      <div className="relative">
        {/* Safe area for iOS notch */}
        <div className="h-[env(safe-area-inset-top,0px)]" />
        
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-pink-500 rounded-lg blur-sm opacity-75" />
              <div className="relative bg-black rounded-lg p-1.5">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              TikVibe
            </span>
          </motion.div>

          {/* Search Button */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSearch}
              className="text-white hover:bg-white/10 rounded-full"
            >
              <Search className="w-5 h-5" />
              <span className="sr-only">Search</span>
            </Button>
          </motion.div>
        </div>

        {/* Feed Type Tabs */}
        {showTabs && (
          <div className="flex items-center justify-center pb-2">
            <div className="flex items-center gap-1 bg-white/5 rounded-full p-1">
              <FeedTab
                label="For You"
                isActive={feedType === 'foryou'}
                onClick={() => handleFeedTypeChange('foryou')}
              />
              <FeedTab
                label="Following"
                isActive={feedType === 'following'}
                onClick={() => handleFeedTypeChange('following')}
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

interface FeedTabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function FeedTab({ label, isActive, onClick }: FeedTabProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative px-4 py-1.5 text-sm font-medium transition-colors rounded-full',
        isActive ? 'text-white' : 'text-gray-400'
      )}
    >
      {isActive && (
        <motion.div
          layoutId="activeFeedTab"
          className="absolute inset-0 bg-white/10 rounded-full"
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
        />
      )}
      <span className="relative z-10">{label}</span>
    </button>
  );
}
