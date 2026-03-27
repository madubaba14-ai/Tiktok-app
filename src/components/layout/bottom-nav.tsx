'use client';

import { motion } from 'framer-motion';
import {
  Home,
  Search,
  Plus,
  MessageCircle,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  activeTab?: string;
  onCreateClick?: () => void;
  onProfileClick?: () => void;
  onInboxClick?: () => void;
  onDiscoverClick?: () => void;
}

export function BottomNav({
  activeTab = 'home',
  onCreateClick,
  onProfileClick,
  onInboxClick,
  onDiscoverClick,
}: BottomNavProps) {
  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      onClick: () => {},
    },
    {
      id: 'discover',
      label: 'Discover',
      icon: Search,
      onClick: onDiscoverClick,
    },
    {
      id: 'create',
      label: 'Create',
      icon: Plus,
      isCreate: true,
      onClick: onCreateClick,
    },
    {
      id: 'inbox',
      label: 'Inbox',
      icon: MessageCircle,
      onClick: onInboxClick,
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      onClick: onProfileClick,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-lg border-t border-white/10">
      {/* Safe area for iOS */}
      <div className="h-[env(safe-area-inset-bottom,0px)]" />
      
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const active = activeTab === item.id;
          const Icon = item.icon;
          
          if (item.isCreate) {
            return (
              <motion.button
                key={item.id}
                onClick={item.onClick}
                className="relative flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="relative">
                  {/* Gradient background for create button */}
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-pink-500 rounded-lg transform rotate-45" />
                  <div className="relative bg-white rounded-lg p-2.5 m-0.5">
                    <Plus className="w-6 h-6 text-black" strokeWidth={2.5} />
                  </div>
                </div>
                <span className="sr-only">{item.label}</span>
              </motion.button>
            );
          }
          
          return (
            <motion.button
              key={item.id}
              onClick={item.onClick}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-1 min-w-[60px]',
                'transition-colors duration-200'
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative">
                <motion.div
                  initial={false}
                  animate={{
                    scale: active ? 1.1 : 1,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 30,
                  }}
                >
                  <Icon
                    className={cn(
                      'w-6 h-6 transition-colors duration-200',
                      active ? 'text-white' : 'text-gray-400'
                    )}
                    strokeWidth={active ? 2.5 : 2}
                    fill={active ? 'currentColor' : 'none'}
                  />
                </motion.div>
                
                {/* Active indicator dot */}
                {active && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 30,
                    }}
                  />
                )}
              </div>
              
              <span
                className={cn(
                  'text-xs font-medium transition-colors duration-200',
                  active ? 'text-white' : 'text-gray-400'
                )}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
