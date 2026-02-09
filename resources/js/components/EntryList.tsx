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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  MoreHorizontal,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { EntryListSkeleton } from "@/components/loading-skeletons";

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

interface EntryListProps {
  entries: Entry[];
  feedId?: number;
  categoryId?: number;
  showSaved?: boolean;
  showUnreadOnly?: boolean;
  isLoading?: boolean;
}

export function EntryList({
  entries,
  feedId,
  categoryId,
  showSaved = false,
  showUnreadOnly = false,
  isLoading = false,
}: EntryListProps) {
  const [isUpdating, setIsUpdating] = useState<number | null>(null);

  const handleToggleRead = (entryId: number, isRead: boolean, readId?: number) => {
    setIsUpdating(entryId);
    
    if (isRead && readId) {
      router.delete(`/entries/${entryId}/read`, {
        onSuccess: () => setIsUpdating(null),
        onError: () => setIsUpdating(null),
      });
    } else {
      router.post(`/entries/${entryId}/read`, {}, {
        onSuccess: () => setIsUpdating(null),
        onError: () => setIsUpdating(null),
      });
    }
  };

  const handleToggleSaved = (entryId: number, isSaved: boolean, savedId?: number) => {
    setIsUpdating(entryId);
    
    if (isSaved && savedId) {
      router.delete(`/entries/${entryId}/save`, {
        onSuccess: () => setIsUpdating(null),
        onError: () => setIsUpdating(null),
      });
    } else {
      router.post(`/entries/${entryId}/save`, {}, {
        onSuccess: () => setIsUpdating(null),
        onError: () => setIsUpdating(null),
      });
    }
  };

  if (isLoading) {
    return <EntryListSkeleton />;
  }

  if (!entries || entries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">No entries found</h3>
            <p className="text-muted-foreground">
              {showSaved
                ? "No saved entries yet"
                : showUnreadOnly
                ? "No unread entries"
                : "No entries available"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <Card
          key={entry.id}
          className={`transition-all duration-200 hover:shadow-md ${!entry.is_read ? 'border-l-4 border-l-white dark:border-l-foreground' : ''}`}
          style={!entry.is_read ? { backgroundColor: 'var(--sidebar)' } : {}}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {entry.thumbnail_url ? (
                  <div className="flex-shrink-0">
                    <img
                      src={entry.thumbnail_url}
                      alt=""
                      className="w-20 h-20 object-cover rounded-md"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ) : null}
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <CardTitle className="text-lg leading-tight flex-1">
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground transition-colors duration-200 flex items-start gap-2 group cursor-pointer"
                      >
                        <span className="flex-1">{entry.title}</span>
                        <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0" />
                      </a>
                    </CardTitle>
                  </div>
                  <CardDescription className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{entry.feed.title}</span>
                    {entry.author && <Separator orientation="vertical" />}
                    {entry.author && <span>by {entry.author}</span>}
                    {(entry.author || entry.feed.title) && <Separator orientation="vertical" />}
                    <time>{formatDistanceToNow(new Date(entry.published_at), { addSuffix: true })}</time>
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleSaved(entry.id, entry.is_saved, entry.saved_id)}
                  disabled={isUpdating === entry.id}
                  className="h-8 w-8 p-0 cursor-pointer"
                >
                  {entry.is_saved ? (
                    <BookmarkCheck className="h-4 w-4" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 cursor-pointer">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center cursor-pointer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in new tab
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleToggleRead(entry.id, entry.is_read, entry.read_id)}
                      disabled={isUpdating === entry.id}
                    	>
                      {entry.is_read ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2 cursor-pointer" />
                          Mark as unread
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2 cursor-pointer" />
                          Mark as read
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleToggleSaved(entry.id, entry.is_saved, entry.saved_id)}
                      disabled={isUpdating === entry.id}
                    >
                      {entry.is_saved ? (
                        <>
                          <Bookmark className="h-4 w-4 mr-2 cursor-pointer" />
                          Remove from saved
                        </>
                      ) : (
                        <>
                          <BookmarkCheck className="h-4 w-4 mr-2 cursor-pointer" />
                          Save for later
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          {entry.excerpt && (
            <CardContent className="pt-0">
              <CardDescription className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {entry.excerpt || entry.content ? (
                  <>{entry.excerpt || entry.content}</>
                ) : (
                  <em className="opacity-70">No description available</em>
                )}
              </CardDescription>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
