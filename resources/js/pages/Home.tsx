"use client";

import { useState } from "react";
import { EntryList } from "@/components/EntryList";
import { EntryCard } from "@/components/EntryCard";
import { FeedForm } from "@/components/FeedForm";
import { type BreadcrumbItem } from "@/types";
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

interface Entry {
  id: number;
  title: string;
  content: string | null;
  excerpt: string | null;
  url: string;
  thumbnail_url: string | null;
  author: string | null;
  published_at: string;
  feed: {
    id: number;
    title: string;
    url: string;
  };
  is_read: boolean;
  is_saved: boolean;
  read_id?: number;
  saved_id?: number;
}

interface DashboardProps {
  stats: {
    totalFeeds: number;
    unreadCount: number;
    savedCount: number;
  };
  entries: {
    all: Entry[];
    unread: Entry[];
    saved: Entry[];
  };
  pagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    has_more: boolean;
  };
  unreadPagination?: {
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
  entryViewMode: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: dashboard().url,
    },
];

export default function Home({ stats, entries, categories, entryViewMode, pagination, unreadPagination, savedPagination }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("unread");
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [viewMode, setViewMode] = useState(entryViewMode);
  const [currentPage, setCurrentPage] = useState(pagination?.current_page || 1);
  const [unreadPage, setUnreadPage] = useState(unreadPagination?.current_page || 1);
  const [savedPage, setSavedPage] = useState(savedPagination?.current_page || 1);
  const [allEntries, setAllEntries] = useState<Entry[]>(entries.all || []);
  const [unreadEntries, setUnreadEntries] = useState<Entry[]>(entries.unread || []);
  const [savedEntries, setSavedEntries] = useState<Entry[]>(entries.saved || []);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [unreadHasMore, setUnreadHasMore] = useState(unreadPagination?.has_more || false);
  const [savedHasMore, setSavedHasMore] = useState(savedPagination?.has_more || false);
  const [unreadCount, setUnreadCount] = useState(stats.unreadCount);
  const [savedCount, setSavedCount] = useState(stats.savedCount);

  const handleMarkAllAsRead = () => {
    // Optimistic update
    setUnreadEntries([]);
    setUnreadCount(0);
    setAllEntries(prev => prev.map(e => ({ ...e, is_read: true })));

    router.post('/entries/mark-all-read', {}, {
      onSuccess: () => {
        router.reload();
      },
      onError: () => {
        // Revert on error
        router.reload();
      }
    });
  };

  const handleRefreshAllFeeds = () => {
    setIsRefreshingAll(true);
    router.post('/entries/refresh-all', {}, {
      onSuccess: () => {
        router.reload();
      },
      onError: (errors) => {
        console.error('Failed to refresh feeds:', errors);
      },
      onFinish: () => {
        setIsRefreshingAll(false);
      }
    });
  };

  const handleViewModeChange = (value: string) => {
    setViewMode(value);
    router.post('/preferences', {
      key: 'entry_view_mode',
      value: value
    });
  };

  const handleReadToggle = (entryId: number, isRead: boolean) => {
    // Update in all lists
    setAllEntries(prev => prev.map(e => e.id === entryId ? { ...e, is_read: isRead } : e));
    
    if (isRead) {
      // Remove from unread list
      setUnreadEntries(prev => prev.filter(e => e.id !== entryId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } else {
      // Add back to unread list (find from allEntries)
      const entry = allEntries.find(e => e.id === entryId);
      if (entry) {
        setUnreadEntries(prev => [{ ...entry, is_read: false }, ...prev].sort(
          (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
        ));
      }
      setUnreadCount(prev => prev + 1);
    }
  };

  const handleSaveToggle = (entryId: number, isSaved: boolean) => {
    setAllEntries(prev => prev.map(e => e.id === entryId ? { ...e, is_saved: isSaved } : e));
    setUnreadEntries(prev => prev.map(e => e.id === entryId ? { ...e, is_saved: isSaved } : e));
    
    if (isSaved) {
      const entry = allEntries.find(e => e.id === entryId) || unreadEntries.find(e => e.id === entryId);
      if (entry) {
        setSavedEntries(prev => [{ ...entry, is_saved: true }, ...prev]);
      }
      setSavedCount(prev => prev + 1);
    } else {
      setSavedEntries(prev => prev.filter(e => e.id !== entryId));
      setSavedCount(prev => Math.max(0, prev - 1));
    }
  };

  const loadMoreEntries = () => {
    if (!pagination?.has_more || isLoadingMore || activeTab !== 'all') return;
    
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    
    router.reload({
      data: { page: nextPage },
      only: ['entries', 'pagination'],
      onSuccess: (page) => {
        const props = page.props as unknown as DashboardProps;
        const newEntries = props.entries?.all || [];
        if (newEntries.length > 0) {
          setAllEntries(prev => [...prev, ...newEntries]);
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

  const loadMoreUnread = () => {
    if (!unreadHasMore || isLoadingMore) return;
    
    setIsLoadingMore(true);
    const nextPage = unreadPage + 1;
    
    router.reload({
      data: { unread_page: nextPage },
      only: ['entries', 'unreadPagination'],
      onSuccess: (page) => {
        const props = page.props as unknown as DashboardProps;
        const newEntries = props.entries?.unread || [];
        if (newEntries.length > 0) {
          setUnreadEntries(prev => [...prev, ...newEntries]);
          setUnreadPage(nextPage);
          setUnreadHasMore(props.unreadPagination?.has_more || false);
        }
        setIsLoadingMore(false);
      },
      onError: (errors) => {
        console.error('Load more unread error:', errors);
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
      only: ['entries', 'savedPagination'],
      onSuccess: (page) => {
        const props = page.props as unknown as DashboardProps;
        const newEntries = props.entries?.saved || [];
        if (newEntries.length > 0) {
          setSavedEntries(prev => [...prev, ...newEntries]);
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
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Home" />
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Home</h1>
            <p className="text-muted-foreground">
              Welcome back! Here's what's new in your feeds.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefreshAllFeeds}
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
                  Refresh All Feeds
                </>
              )}
            </Button>
            <FeedForm categories={categories} />
          </div>
        </div>

        {/* Entries */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="unread" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Unread
                {unreadCount > 0 && (
                  <Badge variant="outline">{unreadCount}</Badge>
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
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
                className="gap-2"
              >
                <CheckCheck className="h-4 w-4" />
                Mark All as Read
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

          <TabsContent value="unread">
            {viewMode === 'list' ? (
              <div className="space-y-4">
                <EntryList entries={unreadEntries} showUnreadOnly={true} onReadToggle={handleReadToggle} onSaveToggle={handleSaveToggle} />
                {unreadHasMore && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={loadMoreUnread}
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
                  {unreadEntries.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      onReadToggle={handleReadToggle}
                      onSaveToggle={handleSaveToggle}
                    />
                  ))}
                </div>
                {unreadHasMore && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={loadMoreUnread}
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
                <EntryList entries={allEntries} onReadToggle={handleReadToggle} onSaveToggle={handleSaveToggle} />
                {pagination?.has_more && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={loadMoreEntries}
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
                  {allEntries.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      onReadToggle={handleReadToggle}
                      onSaveToggle={handleSaveToggle}
                    />
                  ))}
                </div>
                {pagination?.has_more && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={loadMoreEntries}
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
                <EntryList entries={savedEntries} showSaved={true} onReadToggle={handleReadToggle} onSaveToggle={handleSaveToggle} />
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
                  {savedEntries.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      onReadToggle={handleReadToggle}
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
