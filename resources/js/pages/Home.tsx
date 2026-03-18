"use client";

import { useState } from "react";
import { EntryList } from "@/components/EntryList";
import { EntryCard } from "@/components/EntryCard";
import { FeedForm } from "@/components/FeedForm";
import { type BseencrumbItem } from "@/types";
import { Head } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { RefreshCw, Loader2, Eye, Bookmark, BookOpen, LayoutList, LayoutGrid, ChevronDown, CheckCheck } from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import { router } from "@inertiajs/react";
import { dashboard } from '@/routes';

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

interface DashboardProps {
  stats: {
    totalChannels: number;
    unseenCount: number;
    savedCount: number;
  };
  videos: {
    all: Video[];
    unseen: Video[];
    saved: Video[];
  };
  pagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    has_more: boolean;
  };
  unseenPagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    has_more: boolean;
  };
  savedPagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    has_more: boolean;
  };
  categories: Array<{
    id: number;
    name: string;
  }>;
  videoViewMode: string;
}

const bseencrumbs: BseencrumbItem[] = [
    {
        title: 'Home',
        href: dashboard().url,
    },
];

export default function Home({ stats, videos, categories, videoViewMode, pagination, unseenPagination, savedPagination }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("unseen");
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [viewMode, setViewMode] = useState(videoViewMode);
  const [currentPage, setCurrentPage] = useState(pagination?.current_page || 1);
  const [unseenPage, setUnseenPage] = useState(unseenPagination?.current_page || 1);
  const [savedPage, setSavedPage] = useState(savedPagination?.current_page || 1);
  const [allVideos, setAllVideos] = useState<Video[]>(videos.all || []);
  const [unseenVideos, setUnseenVideos] = useState<Video[]>(videos.unseen || []);
  const [savedVideos, setSavedVideos] = useState<Video[]>(videos.saved || []);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [unseenHasMore, setUnseenHasMore] = useState(unseenPagination?.has_more || false);
  const [savedHasMore, setSavedHasMore] = useState(savedPagination?.has_more || false);
  const [unseenCount, setUnseenCount] = useState(stats.unseenCount);
  const [savedCount, setSavedCount] = useState(stats.savedCount);

  const handleMarkAllAsSeen = () => {
    // Optimistic update
    setUnseenVideos([]);
    setUnseenCount(0);
    setAllVideos(prev => prev.map(e => ({ ...e, is_seen: true })));

    router.post('/videos/mark-all-seen', {}, {
      onSuccess: () => {
        router.reload();
      },
      onError: () => {
        // Revert on error
        router.reload();
      }
    });
  };

  const handleRefreshAllChannels = () => {
    setIsRefreshingAll(true);
    router.post('/videos/refresh-all', {}, {
      onSuccess: () => {
        router.reload();
      },
      onError: (errors) => {
        console.error('Failed to refresh channels:', errors);
      },
      onFinish: () => {
        setIsRefreshingAll(false);
      }
    });
  };

  const handleViewModeChange = (value: string) => {
    setViewMode(value);
    router.post('/preferences', {
      key: 'video_view_mode',
      value: value
    });
  };

  const handleSeenToggle = (videoId: number, isSeen: boolean) => {
    // Update in all lists
    setAllVideos(prev => prev.map(e => e.id === videoId ? { ...e, is_seen: isSeen } : e));
    
    if (isSeen) {
      // Remove from unseen list
      setUnseenVideos(prev => prev.filter(e => e.id !== videoId));
      setUnseenCount(prev => Math.max(0, prev - 1));
    } else {
      // Add back to unseen list (find from allVideos)
      const video = allVideos.find(e => e.id === videoId);
      if (video) {
        setUnseenVideos(prev => [{ ...video, is_seen: false }, ...prev].sort(
          (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
        ));
      }
      setUnseenCount(prev => prev + 1);
    }
  };

  const handleSaveToggle = (videoId: number, isSaved: boolean) => {
    setAllVideos(prev => prev.map(e => e.id === videoId ? { ...e, is_saved: isSaved } : e));
    setUnseenVideos(prev => prev.map(e => e.id === videoId ? { ...e, is_saved: isSaved } : e));
    
    if (isSaved) {
      const video = allVideos.find(e => e.id === videoId) || unseenVideos.find(e => e.id === videoId);
      if (video) {
        setSavedVideos(prev => [{ ...video, is_saved: true }, ...prev]);
      }
      setSavedCount(prev => prev + 1);
    } else {
      setSavedVideos(prev => prev.filter(e => e.id !== videoId));
      setSavedCount(prev => Math.max(0, prev - 1));
    }
  };

  const loadMoreVideos = () => {
    if (!pagination?.has_more || isLoadingMore || activeTab !== 'all') return;
    
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    
    router.reload({
      data: { page: nextPage },
      only: ['videos', 'pagination'],
      onSuccess: (page) => {
        const props = page.props as unknown as DashboardProps;
        const newVideos = props.videos?.all || [];
        if (newVideos.length > 0) {
          setAllVideos(prev => [...prev, ...newVideos]);
          setCurrentPage(nextPage);
        }
        setIsLoadingMore(false);
      },
      onError: (errors) => {
        console.error('Load more all error:', errors);
        setIsLoadingMore(false);
      }
    });
  };

  const loadMoreUnseen = () => {
    if (!unseenHasMore || isLoadingMore) return;
    
    setIsLoadingMore(true);
    const nextPage = unseenPage + 1;
    
    router.reload({
      data: { unseen_page: nextPage },
      only: ['videos', 'unseenPagination'],
      onSuccess: (page) => {
        const props = page.props as unknown as DashboardProps;
        const newVideos = props.videos?.unseen || [];
        if (newVideos.length > 0) {
          setUnseenVideos(prev => [...prev, ...newVideos]);
          setUnseenPage(nextPage);
          setUnseenHasMore(props.unseenPagination?.has_more || false);
        }
        setIsLoadingMore(false);
      },
      onError: (errors) => {
        console.error('Load more unseen error:', errors);
        setIsLoadingMore(false);
      }
    });
  };

  const loadMoreSaved = () => {
    if (!savedHasMore || isLoadingMore) return;
    
    setIsLoadingMore(true);
    const nextPage = savedPage + 1;
    
    router.reload({
      data: { saved_page: nextPage },
      only: ['videos', 'savedPagination'],
      onSuccess: (page) => {
        const props = page.props as unknown as DashboardProps;
        const newVideos = props.videos?.saved || [];
        if (newVideos.length > 0) {
          setSavedVideos(prev => [...prev, ...newVideos]);
          setSavedPage(nextPage);
          setSavedHasMore(props.savedPagination?.has_more || false);
        }
        setIsLoadingMore(false);
      },
      onError: (errors) => {
        console.error('Load more saved error:', errors);
        setIsLoadingMore(false);
      }
    });
  };

  return (
    <AppLayout bseencrumbs={bseencrumbs}>
      <Head title="Home" />
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Home</h1>
            <p className="text-muted-foreground">
              Welcome back! Here's what's new in your channels.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefreshAllChannels}
              disabled={isRefreshingAll}
              className="gap-2"
            >
              {isRefreshingAll ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Refresh All Channels
                </>
              )}
            </Button>
            <FeedForm categories={categories} />
          </div>
        </div>

        {/* Videos */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="unseen" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Unseen
                {unseenCount > 0 && (
                  <Badge variant="outline">{unseenCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                All Items
              </TabsTrigger>
              <TabsTrigger value="saved" className="flex items-center gap-2">
                <Bookmark className="h-4 w-4" />
                Saved
                {savedCount > 0 && (
                  <Badge variant="outline">{savedCount}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsSeen}
                disabled={unseenCount === 0}
                className="gap-2"
              >
                <CheckCheck className="h-4 w-4" />
                Mark All as Seen
              </Button>
              <ToggleGroup type="single" value={viewMode} onValueChange={handleViewModeChange}>
                <ToggleGroupItem value="list" aria-label="List view">
                  <LayoutList className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="card" aria-label="Card view">
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          <TabsContent value="unseen">
            {viewMode === 'list' ? (
              <div className="space-y-4">
                <EntryList videos={unseenVideos} showUnseenOnly={true} onSeenToggle={handleSeenToggle} onSaveToggle={handleSaveToggle} />
                {unseenHasMore && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={loadMoreUnseen}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          Load More
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {unseenVideos.map((video) => (
                    <EntryCard
                      key={video.id}
                      video={video}
                      onSeenToggle={handleSeenToggle}
                      onSaveToggle={handleSaveToggle}
                    />
                  ))}
                </div>
                {unseenHasMore && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={loadMoreUnseen}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          Load More
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all">
            {viewMode === 'list' ? (
              <div className="space-y-4">
                <EntryList videos={allVideos} onSeenToggle={handleSeenToggle} onSaveToggle={handleSaveToggle} />
                {pagination?.has_more && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={loadMoreVideos}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          Load More
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allVideos.map((video) => (
                    <EntryCard
                      key={video.id}
                      video={video}
                      onSeenToggle={handleSeenToggle}
                      onSaveToggle={handleSaveToggle}
                    />
                  ))}
                </div>
                {pagination?.has_more && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={loadMoreVideos}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          Load More
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="saved">
            {viewMode === 'list' ? (
              <div className="space-y-4">
                <EntryList videos={savedVideos} showSaved={true} onSeenToggle={handleSeenToggle} onSaveToggle={handleSaveToggle} />
                {savedHasMore && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={loadMoreSaved}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          Load More
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedVideos.map((video) => (
                    <EntryCard
                      key={video.id}
                      video={video}
                      onSeenToggle={handleSeenToggle}
                      onSaveToggle={handleSaveToggle}
                    />
                  ))}
                </div>
                {savedHasMore && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={loadMoreSaved}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          Load More
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
