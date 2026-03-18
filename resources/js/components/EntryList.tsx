'use client';

import { EntryListSkeleton } from '@/components/loading-skeletons';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardTitle,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import {
    Bookmark,
    BookmarkCheck,
    CheckCheck,
    ExternalLink,
    Eye,
    EyeOff,
    MoreHorizontal,
} from 'lucide-react';
import { useCallback, useState } from 'react';

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

interface EntryListProps {
    videos: Entry[];
    feedId?: number;
    categoryId?: number;
    showSaved?: boolean;
    showUnseenOnly?: boolean;
    isLoading?: boolean;
    onSeenToggle?: (entryId: number, isSeen: boolean) => void;
    onSaveToggle?: (entryId: number, isSaved: boolean) => void;
}

export function EntryList({
    videos: entries,
    showSaved = false,
    showUnseenOnly = false,
    isLoading = false,
    onSeenToggle,
    onSaveToggle,
}: EntryListProps) {
    const [isUpdating, setIsUpdating] = useState<number | null>(null);

    const getXsrfToken = () => {
        const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    };

    const handleTitleClick = (entry: Entry) => {
        if (!entry.is_seen) {
            handleToggleSeen(entry.id, false);
        }
        window.open(entry.url, '_blank', 'noopener,noreferrer');
    };

    const handleToggleSeen = useCallback(
        async (entryId: number, isSeen: boolean) => {
            setIsUpdating(entryId);
            // Optimistic update
            onSeenToggle?.(entryId, !isSeen);

            try {
                const method = isSeen ? 'DELETE' : 'POST';
                const res = await fetch(`/videos/${entryId}/seen`, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': getXsrfToken(),
                        'X-Fetch': 'true',
                    },
                });
                if (!res.ok) {
                    onSeenToggle?.(entryId, isSeen);
                }
            } catch {
                onSeenToggle?.(entryId, isSeen);
            } finally {
                setIsUpdating(null);
            }
        },
        [onSeenToggle],
    );

    const handleToggleSaved = useCallback(
        async (entryId: number, isSaved: boolean) => {
            setIsUpdating(entryId);
            onSaveToggle?.(entryId, !isSaved);

            try {
                const method = isSaved ? 'DELETE' : 'POST';
                const res = await fetch(`/videos/${entryId}/save`, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
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
        },
        [onSaveToggle],
    );

    if (isLoading) {
        return <EntryListSkeleton />;
    }

    if (!entries || entries.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="space-y-2 text-center">
                        <h3 className="text-lg font-semibold">
                            No entries found
                        </h3>
                        <p className="text-muted-foreground">
                            {showSaved
                                ? 'No saved entries yet'
                                : showUnseenOnly
                                  ? 'No unread entries'
                                  : 'No entries available'}
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
                    className={`overflow-hidden p-0 transition-all duration-200 hover:shadow-md`}
                    style={
                        !entry.is_seen
                            ? { backgroundColor: 'var(--sidebar)' }
                            : {}
                    }
                >
                    <div className="flex">
                        {entry.thumbnail_url && (
                            <div className="relative hidden w-48 flex-shrink-0 sm:block">
                                <img
                                    src={entry.thumbnail_url}
                                    alt=""
                                    className="absolute inset-0 h-full w-full object-cover"
                                    onError={(e) => {
                                        (
                                            e.currentTarget
                                                .parentElement as HTMLElement
                                        ).style.display = 'none';
                                    }}
                                />
                            </div>
                        )}
                        <div className="min-w-0 flex-1 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1 space-y-1.5">
                                    <CardTitle className="text-base leading-snug">
                                        <a
                                            href="#"
                                            onClick={() =>
                                                handleTitleClick(entry)
                                            }
                                            className="group flex cursor-pointer items-start gap-2 transition-colors duration-200 hover:text-foreground"
                                        >
                                            <span className="line-clamp-2 flex-1">
                                                {entry.title}
                                            </span>
                                            <ExternalLink className="mt-0.5 h-4 w-4 flex-shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                                        </a>
                                    </CardTitle>
                                    <CardDescription className="flex flex-wrap items-center gap-2 text-xs">
                                        <span className="font-medium">
                                            {entry.channel?.title}
                                        </span>
                                        {entry.author && (
                                            <Separator
                                                orientation="vertical"
                                                className="h-3"
                                            />
                                        )}
                                        {entry.author && (
                                            <span>by {entry.author}</span>
                                        )}
                                        {(entry.author ||
                                            entry.channel?.title) && (
                                            <Separator
                                                orientation="vertical"
                                                className="h-3"
                                            />
                                        )}
                                        <time>
                                            {formatDistanceToNow(
                                                new Date(entry.published_at),
                                                { addSuffix: true },
                                            )}
                                        </time>
                                    </CardDescription>
                                    {entry.excerpt && (
                                        <p className="line-clamp-2 pt-1 text-sm leading-relaxed text-muted-foreground">
                                            {entry.excerpt}
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-shrink-0 items-center gap-0.5">
                                    {!entry.is_seen && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                handleToggleSeen(
                                                    entry.id,
                                                    false,
                                                )
                                            }
                                            disabled={isUpdating === entry.id}
                                            className="h-8 w-8 cursor-pointer p-0 text-muted-foreground hover:text-foreground"
                                            title="Mark as seen"
                                        >
                                            <CheckCheck className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            handleToggleSaved(
                                                entry.id,
                                                entry.is_saved,
                                            )
                                        }
                                        disabled={isUpdating === entry.id}
                                        className="h-8 w-8 cursor-pointer p-0"
                                    >
                                        {entry.is_saved ? (
                                            <BookmarkCheck className="h-4 w-4" />
                                        ) : (
                                            <Bookmark className="h-4 w-4" />
                                        )}
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 cursor-pointer p-0"
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <a
                                                    href={entry.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex cursor-pointer items-center"
                                                >
                                                    <ExternalLink className="mr-2 h-4 w-4" />
                                                    Open in new tab
                                                </a>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    handleToggleSeen(
                                                        entry.id,
                                                        entry.is_seen,
                                                    )
                                                }
                                                disabled={
                                                    isUpdating === entry.id
                                                }
                                                className="cursor-pointer"
                                            >
                                                {entry.is_seen ? (
                                                    <>
                                                        <EyeOff className="mr-2 h-4 w-4" />
                                                        Mark as unseen
                                                    </>
                                                ) : (
                                                    <>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        Mark as seen
                                                    </>
                                                )}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    handleToggleSaved(
                                                        entry.id,
                                                        entry.is_saved,
                                                    )
                                                }
                                                disabled={
                                                    isUpdating === entry.id
                                                }
                                                className="cursor-pointer"
                                            >
                                                {entry.is_saved ? (
                                                    <>
                                                        <Bookmark className="mr-2 h-4 w-4" />
                                                        Remove from saved
                                                    </>
                                                ) : (
                                                    <>
                                                        <BookmarkCheck className="mr-2 h-4 w-4" />
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
