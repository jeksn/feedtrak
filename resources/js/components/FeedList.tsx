"use client";

import { useState } from "react";
import { router } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { MoreHorizontal, RefreshCw, Trash2, Loader2, CheckCheck, ExternalLink } from "lucide-react";
import { FeedForm } from "./FeedForm";
import { formatDistanceToNow } from "date-fns";

interface Feed {
  id: number;
  title: string;
  description: string;
  url: string;
  feed_url: string;
  type: string;
  icon_url: string | null;
  last_fetched_at: string | null;
  pivot: {
    category_id: number | null;
    is_active: boolean;
  };
  category: {
    id: number;
    name: string;
  } | null;
  entries: Array<{
    id: number;
    title: string;
    published_at: string;
  }>;
  unread_count: number;
}

interface Category {
  id: number;
  name: string;
}

interface FeedListProps {
  feeds: Feed[];
  categories: Category[];
  isLoading?: boolean;
}

export function FeedList({ feeds, categories, isLoading = false }: FeedListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<number | null>(null);

  const handleDeleteFeed = (feedId: number) => {
    router.delete(`/feeds/${feedId}`, {
      onSuccess: () => {
        setDeleteDialogOpen(null);
      },
      onError: (errors) => {
        console.error('Failed to delete feed:', errors);
      }
    });
  };

  const handleRefreshFeed = (feedId: number) => {
    setIsRefreshing(feedId);
    router.post(`/feeds/${feedId}/refresh`, {}, {
      onSuccess: () => {
        setIsRefreshing(null);
      },
      onError: (errors) => {
        console.error('Failed to refresh feed:', errors);
        setIsRefreshing(null);
      }
    });
  };

  const handleMarkAllAsRead = (feedId?: number) => {
    if (feedId) {
      // Mark all entries for a specific feed as read
      router.post(`/feeds/${feedId}/mark-all-read`, {}, {
        onSuccess: () => {
          router.reload();
        },
        onError: (errors) => {
          console.error('Failed to mark all as read:', errors);
        }
      });
    } else {
      // Mark all entries as read
      router.post('/entries/mark-all-read', {}, {
        onSuccess: () => {
          router.reload();
        },
        onError: (errors) => {
          console.error('Failed to mark all as read:', errors);
        }
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Your Feeds</h2>
          <p className="text-muted-foreground">
            Manage your RSS feeds and subscriptions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleMarkAllAsRead()}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All as Read
          </Button>
          <FeedForm categories={categories} />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : feeds.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No feeds yet</h3>
          <p className="text-muted-foreground mb-4">
            Get started by adding your first RSS feed
          </p>
          <FeedForm categories={categories} />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_120px_80px_150px_70px] gap-4 px-6 py-3 bg-muted/50 font-medium text-sm text-muted-foreground">
            <div>Feed</div>
            <div>Category</div>
            <div>Unread</div>
            <div>Last Updated</div>
            <div></div>
          </div>
          
          {/* Table Body */}
          <div className="divide-y">
            {feeds.map((feed) => (
              <div key={feed.id} className="grid grid-cols-[1fr_120px_80px_150px_70px] gap-4 px-6 py-4 hover:bg-muted/50 transition-colors items-center">
                <div className="min-w-0">
                  <div 
                    className="font-medium hover:text-blue-600 cursor-pointer transition-colors duration-200 inline-flex items-center gap-2 group"
                    onClick={() => router.visit(`/feeds/${feed.id}`)}
                  >
                    <span className="truncate">{feed.title}</span>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0" />
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {feed.description || <em className="opacity-70">No description</em>}
                  </p>
                </div>
                <div>
                  {feed.category && (
                    <span className="text-sm text-muted-foreground">
                      {feed.category.name}
                    </span>
                  )}
                </div>
                <div>
                  {feed.unread_count > 0 ? (
                    <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 text-white">
                      {feed.unread_count}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">0</span>
                  )}
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">
                    {feed.last_fetched_at 
                      ? formatDistanceToNow(new Date(feed.last_fetched_at), { addSuffix: true })
                      : 'Never'
                    }
                  </span>
                </div>
                <div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => router.visit(`/feeds/${feed.id}`)}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Feed
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = feed.url;
                          link.target = '_blank';
                          link.rel = 'noopener noreferrer';
                          link.click();
                        }}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Visit Website
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleRefreshFeed(feed.id)}
                        disabled={isRefreshing === feed.id}
                      >
                        {isRefreshing === feed.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Refresh Feed
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleMarkAllAsRead(feed.id)}
                      >
                        <CheckCheck className="mr-2 h-4 w-4" />
                        Mark All as Read
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteDialogOpen(feed.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Feed
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen !== null} onOpenChange={(open) => !open && setDeleteDialogOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feed</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{feeds.find(f => f.id === deleteDialogOpen)?.title}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialogOpen && handleDeleteFeed(deleteDialogOpen)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
