"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Bookmark, Check, Clock, Image as ImageIcon } from "lucide-react";
import { router } from "@inertiajs/react";
import { formatDistanceToNow, format } from "date-fns";

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

interface EntryCardProps {
  entry: Entry;
  onReadToggle?: (entryId: number, isRead: boolean) => void;
  onSaveToggle?: (entryId: number, isSaved: boolean) => void;
}

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const distance = formatDistanceToNow(date, { addSuffix: false });
  return `${distance} ago`;
};

export function EntryCard({ entry, onReadToggle, onSaveToggle }: EntryCardProps) {
  const handleMarkAsRead = () => {
    router.post(`/entries/${entry.id}/read`, {}, {
      onSuccess: () => {
        onReadToggle?.(entry.id, true);
      }
    });
  };

  const handleSave = () => {
    if (entry.is_saved) {
      router.delete(`/saved-items/${entry.saved_id}`, {
        onSuccess: () => {
          onSaveToggle?.(entry.id, false);
        }
      });
    } else {
      router.post(`/saved-items`, { entry_id: entry.id }, {
        onSuccess: () => {
          onSaveToggle?.(entry.id, true);
        }
      });
    }
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-md border h-full overflow-hidden p-0`}>
      <div className="flex flex-col h-full">
        {/* Thumbnail */}
        <div className="h-48 bg-muted relative overflow-hidden">
          {entry.thumbnail_url ? (
            <img
              src={entry.thumbnail_url}
              alt={entry.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Hide image on error
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                e.currentTarget.parentElement?.insertAdjacentHTML(
                  'beforeend',
                  '<div class="text-muted-foreground"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>'
                );
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold line-clamp-2 mb-2">
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-600 transition-colors cursor-pointer"
                onClick={(e) => {
                  if (!entry.is_read) {
                    handleMarkAsRead();
                  }
                }}
              >
                {entry.title}
              </a>
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span className="truncate">{entry.feed.title}</span>
              {entry.author && <span>• {entry.author}</span>}
            </div>
            <div className="text-xs text-muted-foreground mb-3">
              {formatRelativeTime(entry.published_at)}
            </div>
            {entry.excerpt && (
              <p className="text-sm text-muted-foreground line-clamp-3 flex-1">
                {entry.excerpt}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              className={entry.is_saved ? 'text-yellow-600 hover:text-yellow-700' : ''}
            >
              <Bookmark className={`w-4 h-4 ${entry.is_saved ? 'fill-current' : ''}`} />
            </Button>
            {!entry.is_read && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAsRead}
                className="text-blue-600 hover:text-blue-700"
              >
                <Check className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              asChild
            >
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (!entry.is_read) {
                    handleMarkAsRead();
                  }
                }}
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
