"use client";

import { EntryList } from "@/components/EntryList";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { ArrowLeft, RefreshCw, CheckCheck, Loader2 } from "lucide-react";
import AppLayout from '@/layouts/app-layout';
import { type BseencrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState } from "react";

interface Channel {
  id: number;
  title: string;
  description: string;
  url: string;
  channel_url: string;
  type: string;
  icon_url: string | null;
  last_fetched_at: string | null;
  category: {
    id: number;
    name: string;
  } | null;
  unseen_count: number;
}

interface Video {
  id: number;
  title: string;
  content: string | null;
  excerpt: string | null;
  url: string;
  thumbnail_url: string | null;
  author: string | null;
  published_at: string;
  channel: {
    id: number;
    title: string;
    url: string;
  };
  is_seen: boolean;
  is_saved: boolean;
  seen_id?: number;
  saved_id?: number;
}

interface ChannelDetailProps {
  channel: Channel;
  videos: Video[];
}

export default function ChannelDetail({ channel, videos: initialVideos }: ChannelDetailProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [unseenCount, setUnseenCount] = useState(channel.unseen_count);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.post(`/channels/${channel.id}/refresh`, {}, {
      onSuccess: () => {
        setIsRefreshing(false);
        router.reload();
      },
      onError: () => {
        setIsRefreshing(false);
      }
    });
  };

  const handleMarkAllAsSeen = () => {
    console.log('Mark all as seen clicked for channel:', channel.id);
    
    // Optimistic update
    setVideos(prev => prev.map(e => ({ ...e, is_seen: true })));
    setUnseenCount(0);

    router.post(`/channels/${channel.id}/mark-all-seen`, {}, {
      onSuccess: () => {
        console.log('Mark all as seen success');
        router.reload();
      },
      onError: (errors) => {
        console.error('Mark all as seen error:', errors);
        // Revert on error
        router.reload();
      }
    });
  };

  const handleSeenToggle = (videoId: number, isSeen: boolean) => {
    setVideos(prev => prev.map(e => 
      e.id === videoId ? { ...e, is_seen: isSeen } : e
    ));
    
    if (isSeen) {
      setUnseenCount(prev => Math.max(0, prev - 1));
    } else {
      setUnseenCount(prev => prev + 1);
    }
  };

  const handleSaveToggle = (videoId: number, isSaved: boolean) => {
    setVideos(prev => prev.map(e => 
      e.id === videoId ? { ...e, is_saved: isSaved } : e
    ));
  };

  const bseencrumbs: BseencrumbItem[] = [
    {
      title: 'Channels',
      href: '/channels',
    },
    {
      title: channel.title,
      href: `/channels/${channel.id}`,
    },
  ];

  return (
    <AppLayout bseencrumbs={bseencrumbs}>
      <Head title={channel.title} />
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.visit('/channels')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Channels
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{channel.title}</h1>
            <p className="text-muted-foreground">{channel.description}</p>
          </div>
        </div>

        {/* Channel Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {channel.category && (
                    <Badge
                      variant="secondary"
                    >
                      {channel.category.name}
                    </Badge>
                  )}
                  {unseenCount > 0 && (
                    <Badge variant="outline">
                      {unseenCount} unseen
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Source: <a href={channel.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">{channel.url}</a></div>
                  {channel.last_fetched_at && (
                    <div>Last updated: {new Date(channel.last_fetched_at).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllAsSeen}
                  disabled={unseenCount === 0}
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark All as Seen
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Videos */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Recent Videos {videos.length > 0 && `(${videos.length})`}
          </h2>
          <EntryList 
            videos={videos} 
            channelId={channel.id} 
            onSeenToggle={handleSeenToggle}
            onSaveToggle={handleSaveToggle}
          />
        </div>
      </div>
    </AppLayout>
  );
}
