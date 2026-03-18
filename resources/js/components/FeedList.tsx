'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { router } from '@inertiajs/react';
import { useState } from 'react';

import { formatDistanceToNow } from 'date-fns';
import {
    CheckCheck,
    ExternalLink,
    Loader2,
    MoreHorizontal,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import { FeedForm } from './FeedForm';

interface Feed {
    id: number;
    title: string;
    description: string;
    url: string;
    feed_url: string;
    type: string;
    icon_url: string | null;
    avatar_url: string | null;
    banner_url: string | null;
    subscriber_count: number | null;
    video_count: number | null;
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
    channels: Feed[];
    categories: Category[];
    isLoading?: boolean;
}

export function FeedList({
    channels: feeds,
    categories,
    isLoading = false,
}: FeedListProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState<number | null>(
        null,
    );
    const [isRefreshing, setIsRefreshing] = useState<number | null>(null);
    const [editingCategory, setEditingCategory] = useState<number | null>(null);

    const handleDeleteFeed = (feedId: number) => {
        router.delete(`/channels/${feedId}`, {
            onSuccess: () => {
                setDeleteDialogOpen(null);
            },
            onError: (errors) => {
                console.error('Failed to delete feed:', errors);
            },
        });
    };

    const handleRefreshFeed = (feedId: number) => {
        setIsRefreshing(feedId);
        router.post(
            `/channels/${feedId}/refresh`,
            {},
            {
                onSuccess: () => {
                    setIsRefreshing(null);
                },
                onError: (errors) => {
                    console.error('Failed to refresh feed:', errors);
                    setIsRefreshing(null);
                },
            },
        );
    };

    const handleMarkAllAsRead = (feedId?: number) => {
        if (feedId) {
            router.post(
                `/channels/${feedId}/mark-all-seen`,
                {},
                {
                    onSuccess: () => {
                        router.reload();
                    },
                    onError: (errors) => {
                        console.error('Failed to mark all as read:', errors);
                    },
                },
            );
        } else {
            router.post(
                '/videos/mark-all-seen',
                {},
                {
                    onSuccess: () => {
                        router.reload();
                    },
                    onError: (errors) => {
                        console.error('Failed to mark all as read:', errors);
                    },
                },
            );
        }
    };

    const handleCategoryChange = (feedId: number, categoryId: string) => {
        setEditingCategory(feedId);
        const catId = categoryId === 'none' ? null : parseInt(categoryId);

        router.put(
            `/channels/${feedId}/category`,
            {
                category_id: catId,
            },
            {
                onSuccess: () => {
                    setEditingCategory(null);
                    router.reload();
                },
                onError: (errors) => {
                    console.error('Failed to update category:', errors);
                    setEditingCategory(null);
                },
            },
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                        Your Sources
                    </h2>
                    <p className="text-muted-foreground">
                        Manage all your feed sources
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAllAsRead()}
                    >
                        <CheckCheck className="mr-2 h-4 w-4" />
                        Mark All as Read
                    </Button>
                    <FeedForm categories={categories} />
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={i}
                            className="h-16 animate-pulse rounded bg-muted"
                        />
                    ))}
                </div>
            ) : feeds.length === 0 ? (
                <div className="py-12 text-center">
                    <h3 className="mb-2 text-lg font-semibold">No feeds yet</h3>
                    <p className="mb-4 text-muted-foreground">
                        Get started by adding your first RSS feed
                    </p>
                    <FeedForm categories={categories} />
                </div>
            ) : (
                <div className="overflow-hidden rounded-lg border">
                    {/* Table Header */}
                    <div className="grid grid-cols-[1fr_150px_80px_150px_70px] gap-4 bg-muted/50 px-6 py-3 text-sm font-medium text-muted-foreground">
                        <div>Feed</div>
                        <div>Category</div>
                        <div>Unread</div>
                        <div>Last Updated</div>
                        <div></div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y">
                        {feeds.map((feed) => (
                            <div
                                key={feed.id}
                                className="grid grid-cols-[1fr_150px_80px_150px_70px] items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/50"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    {feed.avatar_url || feed.icon_url ? (
                                        <img
                                            src={
                                                feed.avatar_url ||
                                                feed.icon_url ||
                                                ''
                                            }
                                            alt=""
                                            className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                                            <span className="text-lg font-medium text-muted-foreground">
                                                {feed.title
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <div
                                            className="group inline-flex cursor-pointer items-center gap-2 font-medium transition-colors duration-200"
                                            onClick={() =>
                                                router.visit(
                                                    `/channels/${feed.id}`,
                                                )
                                            }
                                        >
                                            <span className="truncate">
                                                {feed.title}
                                            </span>
                                            <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                                        </div>
                                        <p className="truncate text-sm text-muted-foreground">
                                            {feed.description || (
                                                <em className="opacity-70">
                                                    No description
                                                </em>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <Select
                                        value={
                                            feed.category?.id?.toString() ||
                                            'none'
                                        }
                                        onValueChange={(value) =>
                                            handleCategoryChange(feed.id, value)
                                        }
                                        disabled={editingCategory === feed.id}
                                    >
                                        <SelectTrigger className="h-8 w-[140px]">
                                            <SelectValue placeholder="Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                None
                                            </SelectItem>
                                            {categories.map((cat) => (
                                                <SelectItem
                                                    key={cat.id}
                                                    value={cat.id.toString()}
                                                >
                                                    {cat.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    {feed.unread_count > 0 ? (
                                        <Badge
                                            variant="default"
                                            className="bg-white text-black"
                                        >
                                            {feed.unread_count}
                                        </Badge>
                                    ) : (
                                        <span className="text-sm text-muted-foreground">
                                            0
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">
                                        {feed.last_fetched_at
                                            ? formatDistanceToNow(
                                                  new Date(
                                                      feed.last_fetched_at,
                                                  ),
                                                  { addSuffix: true },
                                              )
                                            : 'Never'}
                                    </span>
                                </div>
                                <div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                className="h-8 w-8 p-0"
                                            >
                                                <span className="sr-only">
                                                    Open menu
                                                </span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    router.visit(
                                                        `/channels/${feed.id}`,
                                                    )
                                                }
                                            >
                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                View Feed
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    const link =
                                                        document.createElement(
                                                            'a',
                                                        );
                                                    link.href = feed.url;
                                                    link.target = '_blank';
                                                    link.rel =
                                                        'noopener noreferrer';
                                                    link.click();
                                                }}
                                            >
                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                Visit Website
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    handleRefreshFeed(feed.id)
                                                }
                                                disabled={
                                                    isRefreshing === feed.id
                                                }
                                            >
                                                {isRefreshing === feed.id ? (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                ) : (
                                                    <RefreshCw className="mr-2 h-4 w-4" />
                                                )}
                                                Refresh Feed
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    handleMarkAllAsRead(feed.id)
                                                }
                                            >
                                                <CheckCheck className="mr-2 h-4 w-4" />
                                                Mark All as Read
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-destructive focus:text-destructive"
                                                onClick={() =>
                                                    setDeleteDialogOpen(feed.id)
                                                }
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
            <AlertDialog
                open={deleteDialogOpen !== null}
                onOpenChange={(open) => !open && setDeleteDialogOpen(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Feed</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "
                            {
                                feeds.find((f) => f.id === deleteDialogOpen)
                                    ?.title
                            }
                            "? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() =>
                                deleteDialogOpen &&
                                handleDeleteFeed(deleteDialogOpen)
                            }
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
