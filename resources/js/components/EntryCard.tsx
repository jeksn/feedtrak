'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import {
    Bookmark,
    Check,
    ExternalLink,
    Image as ImageIcon,
} from 'lucide-react';

interface Entry {
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

interface EntryCardProps {
    video: Entry;
    onSeenToggle?: (videoId: number, isSeen: boolean) => void;
    onSaveToggle?: (videoId: number, isSaved: boolean) => void;
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

export function EntryCard({
    video,
    onSeenToggle,
    onSaveToggle,
}: EntryCardProps) {
    const getXsrfToken = () => {
        const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    };

    const handleTitleClick = () => {
        if (!video.is_seen) {
            handleMarkAsRead();
        }
        window.open(video.url, '_blank', 'noopener,noreferrer');
    };

    const handleMarkAsRead = async () => {
        onSeenToggle?.(video.id, true);
        try {
            const res = await fetch(`/entries/${video.id}/read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getXsrfToken(),
                    'X-Fetch': 'true',
                },
            });
            if (!res.ok) {
                onSeenToggle?.(video.id, false);
            }
        } catch {
            onSeenToggle?.(video.id, false);
        }
    };

    const handleSave = async () => {
        const newSaved = !video.is_saved;
        onSaveToggle?.(video.id, newSaved);
        try {
            const method = video.is_saved ? 'DELETE' : 'POST';
            const res = await fetch(`/entries/${video.id}/save`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': getXsrfToken(),
                    'X-Fetch': 'true',
                },
            });
            if (!res.ok) {
                onSaveToggle?.(video.id, video.is_saved);
            }
        } catch {
            onSaveToggle?.(video.id, video.is_saved);
        }
    };

    return (
        <Card
            className={`h-full overflow-hidden border p-0 transition-all duration-200 hover:shadow-md`}
        >
            <div className="flex h-full flex-col">
                {/* Thumbnail */}
                <div className="relative h-48 overflow-hidden bg-muted">
                    {video.thumbnail_url ? (
                        <img
                            src={video.thumbnail_url}
                            alt={video.title}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                                // Hide image on error
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement?.classList.add(
                                    'flex',
                                    'items-center',
                                    'justify-center',
                                );
                                e.currentTarget.parentElement?.insertAdjacentHTML(
                                    'beforeend',
                                    '<div class="text-muted-foreground"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>',
                                );
                            }}
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-12 w-12 text-muted-foreground" />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-4">
                    <div className="min-w-0 flex-1">
                        <h3 className="mb-2 line-clamp-2 text-base font-semibold">
                            <a
                                href="#"
                                onClick={handleTitleClick}
                                className="cursor-pointer transition-colors hover:text-blue-600"
                            >
                                {video.title}
                            </a>
                        </h3>
                        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="truncate">
                                {video.channel.title}
                            </span>
                            {video.author && <span>• {video.author}</span>}
                        </div>
                        <div className="mb-3 text-xs text-muted-foreground">
                            {formatRelativeTime(video.published_at)}
                        </div>
                        {video.excerpt && (
                            <p className="line-clamp-3 flex-1 text-sm text-muted-foreground">
                                {video.excerpt}
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex items-center gap-2 border-t pt-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSave}
                            className={
                                video.is_saved
                                    ? 'text-yellow-600 hover:text-yellow-700'
                                    : ''
                            }
                        >
                            <Bookmark
                                className={`h-4 w-4 ${video.is_saved ? 'fill-current' : ''}`}
                            />
                        </Button>
                        {!video.is_seen && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleMarkAsRead}
                                className="text-blue-600 hover:text-blue-700"
                            >
                                <Check className="h-4 w-4" />
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" asChild>
                            <a
                                href={video.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => {
                                    if (!video.is_seen) {
                                        handleMarkAsRead();
                                    }
                                }}
                            >
                                <ExternalLink className="h-4 w-4" />
                            </a>
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}
