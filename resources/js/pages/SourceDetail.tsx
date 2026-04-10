'use client';

import { EntryList } from '@/components/EntryList';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { CheckCheck, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Channel {
    id: number;
    title: string;
    description: string;
    url: string;
    channel_url: string;
    type: string;
    icon_url: string | null;
    last_fetched_at: string | null;
    category: {
        id: number;
        name: string;
    } | null;
    unseen_count: number;
}

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

interface Category {
    id: number | string | null;
    name: string;
}

interface ChannelDetailProps {
    channel: Channel;
    videos: Video[];
    categories: Category[];
}

export default function ChannelDetail({
    channel,
    videos: initialVideos,
    categories,
}: ChannelDetailProps) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
    const [videos, setVideos] = useState<Video[]>(initialVideos);
    const [unseenCount, setUnseenCount] = useState(channel.unseen_count);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const handleCategoryChange = (categoryId: string) => {
        setIsUpdatingCategory(true);
        const catId =
            categoryId === 'none'
                ? null
                : categoryId === 'podcasts'
                  ? 'podcasts'
                  : parseInt(categoryId);

        router.put(
            `/sources/${channel.id}/category`,
            {
                category_id: catId,
            },
            {
                onSuccess: () => {
                    setIsUpdatingCategory(false);
                    router.reload();
                },
                onError: () => {
                    setIsUpdatingCategory(false);
                },
            },
        );
    };

    const currentCategoryId = channel.category?.id?.toString() ?? 'none';

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.post(
            `/sources/${channel.id}/refresh`,
            {},
            {
                onSuccess: () => {
                    setIsRefreshing(false);
                    router.reload();
                },
                onError: () => {
                    setIsRefreshing(false);
                },
            },
        );
    };

    const handleMarkAllAsSeen = () => {
        console.log('Mark all as seen clicked for channel:', channel.id);

        // Optimistic update
        setVideos((prev) => prev.map((e) => ({ ...e, is_seen: true })));
        setUnseenCount(0);

        router.post(
            `/sources/${channel.id}/mark-all-seen`,
            {},
            {
                onSuccess: () => {
                    console.log('Mark all as seen success');
                    router.reload();
                },
                onError: (errors) => {
                    console.error('Mark all as seen error:', errors);
                    // Revert on error
                    router.reload();
                },
            },
        );
    };

    const handleSeenToggle = (videoId: number, isSeen: boolean) => {
        setVideos((prev) =>
            prev.map((e) => (e.id === videoId ? { ...e, is_seen: isSeen } : e)),
        );

        if (isSeen) {
            setUnseenCount((prev) => Math.max(0, prev - 1));
        } else {
            setUnseenCount((prev) => prev + 1);
        }
    };

    const handleSaveToggle = (videoId: number, isSaved: boolean) => {
        setVideos((prev) =>
            prev.map((e) =>
                e.id === videoId ? { ...e, is_saved: isSaved } : e,
            ),
        );
    };

    const handleDeleteSource = () => {
        router.delete(`/sources/${channel.id}`, {
            onSuccess: () => {
                router.visit('/sources');
            },
            onError: (errors) => {
                console.error('Failed to delete source:', errors);
            },
        });
    };

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Sources',
            href: '/sources',
        },
        {
            title: channel.title,
            href: `/sources/${channel.id}`,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={channel.title} />
            <div className="container mx-auto space-y-6 px-6 py-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold tracking-tight">
                            {channel.title}
                        </h1>
                        <p className="text-muted-foreground">
                            {channel.description}
                        </p>
                    </div>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteDialogOpen(true)}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Source
                    </Button>
                </div>

                {/* Channel Info Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Select
                                        value={currentCategoryId}
                                        onValueChange={handleCategoryChange}
                                        disabled={isUpdatingCategory}
                                    >
                                        <SelectTrigger className="h-7 w-[140px]">
                                            <SelectValue placeholder="Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((cat) => (
                                                <SelectItem
                                                    key={cat.id ?? 'none'}
                                                    value={
                                                        cat.id?.toString() ??
                                                        'none'
                                                    }
                                                >
                                                    {cat.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {unseenCount > 0 && (
                                        <Badge variant="outline">
                                            {unseenCount} unseen
                                        </Badge>
                                    )}
                                </div>
                                <div className="space-y-1 text-sm text-muted-foreground">
                                    <div>
                                        Source:{' '}
                                        <a
                                            href={channel.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:text-blue-600"
                                        >
                                            {channel.url}
                                        </a>
                                    </div>
                                    {channel.last_fetched_at && (
                                        <div>
                                            Last updated:{' '}
                                            {new Date(
                                                channel.last_fetched_at,
                                            ).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleMarkAllAsSeen}
                                    disabled={unseenCount === 0}
                                >
                                    <CheckCheck className="mr-2 h-4 w-4" />
                                    Mark All as Seen
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                >
                                    {isRefreshing ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                    )}
                                    Refresh
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {/* Videos */}
                <div>
                    <h2 className="mb-4 text-2xl font-bold tracking-tight">
                        Recent Videos{' '}
                        {videos.length > 0 && `(${videos.length})`}
                    </h2>
                    <EntryList
                        videos={videos}
                        feedId={channel.id}
                        onSeenToggle={handleSeenToggle}
                        onSaveToggle={handleSaveToggle}
                    />
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                open={deleteDialogOpen}
                onOpenChange={(open) => !open && setDeleteDialogOpen(false)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Source</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{channel.title}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteSource}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
