"use client";

import { useState } from "react";
import { router } from "@inertiajs/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { MoreHorizontal, RefreshCw, Trash2, Loader2, CheckCheck, ExternalLink, Rss } from "lucide-react";
import { FeedForm } from "./FeedForm";
import { CategoryAssign } from "./CategoryAssign";
import { FeedCardSkeleton } from "./loading-skeletons";
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
    color: string | null;
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
  color: string | null;
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <FeedCardSkeleton key={i} />
          ))}
        </div>
      ) : feeds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">No feeds yet</h3>
              <p className="text-muted-foreground">
                Get started by adding your first RSS feed
              </p>
              <FeedForm categories={categories} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {feeds.map((feed) => (
            <Card key={feed.id} className="relative transition-all duration-200 hover:shadow-md hover:-translate-y-1">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg hover:text-blue-600 cursor-pointer transition-colors duration-200 flex items-center gap-2 group"
                              onClick={() => router.visit(`/feeds/${feed.id}`)}>
                      <span className="flex-1">{feed.title}</span>
                      <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0" />
                    </CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {feed.description || <em className="opacity-70">No description available</em>}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {feed.unread_count > 0 && (
                      <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 text-white">
                        {feed.unread_count} new
                      </Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleMarkAllAsRead(feed.id)}
                        disabled={feed.unread_count === 0}
                      >
                        <CheckCheck className="mr-2 h-4 w-4" />
                        Mark All as Read
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleRefreshFeed(feed.id)}
                        disabled={isRefreshing === feed.id}
                      >
                        {isRefreshing === feed.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Refresh
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteDialogOpen(feed.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  </div>
                </div>
                {feed.category && (
                  <Badge
                    variant="secondary"
                    style={{
                      backgroundColor: feed.category.color || undefined,
                    }}
                  >
                    {feed.category.name}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Rss className="h-3 w-3" />
                      {feed.entries.length} recent items
                    </span>
                    {feed.unread_count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {feed.unread_count} unread
                      </Badge>
                    )}
                  </div>
                  {feed.last_fetched_at && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" />
                      Last updated: {" "}
                      {formatDistanceToNow(new Date(feed.last_fetched_at), { addSuffix: true })}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground truncate font-mono bg-muted/50 px-2 py-1 rounded">
                    {feed.url}
                  </div>
                  <div className="pt-2">
                    <CategoryAssign
                      feedId={feed.id}
                      currentCategory={feed.category}
                      categories={categories}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
