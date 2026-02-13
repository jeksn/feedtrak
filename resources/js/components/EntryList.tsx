"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  CheckCheck,
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
  onReadToggle?: (entryId: number, isRead: boolean) => void;
  onSaveToggle?: (entryId: number, isSaved: boolean) => void;
}

export function EntryList({
  entries,
  showSaved = false,
  showUnreadOnly = false,
  isLoading = false,
  onReadToggle,
  onSaveToggle,
}: EntryListProps) {
  const [isUpdating, setIsUpdating] = useState<number | null>(null);

  const getXsrfToken = () => {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  };

  const handleTitleClick = (entry: Entry) => {
    if (!entry.is_read) {
      handleToggleRead(entry.id, false);
    }
    window.open(entry.url, '_blank', 'noopener,noreferrer');
  };

  const handleToggleRead = useCallback(async (entryId: number, isRead: boolean) => {
    setIsUpdating(entryId);
    // Optimistic update
    onReadToggle?.(entryId, !isRead);

    try {
      const method = isRead ? 'DELETE' : 'POST';
      const res = await fetch(`/entries/${entryId}/read`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-XSRF-TOKEN': getXsrfToken(),
          'X-Fetch': 'true',
        },
      });
      if (!res.ok) {
        onReadToggle?.(entryId, isRead);
      }
    } catch {
      onReadToggle?.(entryId, isRead);
    } finally {
      setIsUpdating(null);
    }
  }, [onReadToggle]);

  const handleToggleSaved = useCallback(async (entryId: number, isSaved: boolean) => {
    setIsUpdating(entryId);
    onSaveToggle?.(entryId, !isSaved);

    try {
      const method = isSaved ? 'DELETE' : 'POST';
      const url = isSaved ? `/entries/${entryId}/save` : `/entries/${entryId}/save`;
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-XSRF-TOKEN': getXsrfToken(),
          'X-Fetch': 'true',
        },
      });
      if (!res.ok) {
        onSaveToggle?.(entryId, isSaved);
      }
    } catch {
      onSaveToggle?.(entryId, isSaved);
    } finally {
      setIsUpdating(null);
    }
  }, [onSaveToggle]);

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
          className={`transition-all duration-200 hover:shadow-md overflow-hidden p-0`}
          style={!entry.is_read ? { backgroundColor: 'var(--sidebar)' } : {}}
        >
          <div className="flex">
            {entry.thumbnail_url && (
              <div className="flex-shrink-0 w-48 relative hidden sm:block">
                <img
                  src={entry.thumbnail_url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="flex-1 min-w-0 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <CardTitle className="text-base leading-snug">
                    <a
                      href="#"
                      onClick={() => handleTitleClick(entry)}
                      className="hover:text-foreground transition-colors duration-200 flex items-start gap-2 group cursor-pointer"
                    >
                      <span className="flex-1 line-clamp-2">{entry.title}</span>
                      <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0 mt-0.5" />
                    </a>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="font-medium">{entry.feed.title}</span>
                    {entry.author && <Separator orientation="vertical" className="h-3" />}
                    {entry.author && <span>by {entry.author}</span>}
                    {(entry.author || entry.feed.title) && <Separator orientation="vertical" className="h-3" />}
                    <time>{formatDistanceToNow(new Date(entry.published_at), { addSuffix: true })}</time>
                  </CardDescription>
                  {entry.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed pt-1">
                      {entry.excerpt}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {!entry.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleRead(entry.id, false)}
                      disabled={isUpdating === entry.id}
                      className="h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                      title="Mark as read"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleSaved(entry.id, entry.is_saved)}
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
                        onClick={() => handleToggleRead(entry.id, entry.is_read)}
                        disabled={isUpdating === entry.id}
                        className="cursor-pointer"
                      >
                        {entry.is_read ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-2" />
                            Mark as unread
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            Mark as read
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleToggleSaved(entry.id, entry.is_saved)}
                        disabled={isUpdating === entry.id}
                        className="cursor-pointer"
                      >
                        {entry.is_saved ? (
                          <>
                            <Bookmark className="h-4 w-4 mr-2" />
                            Remove from saved
                          </>
                        ) : (
                          <>
                            <BookmarkCheck className="h-4 w-4 mr-2" />
                            Save for later
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
