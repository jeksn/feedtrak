'use client';

import { FeedList } from '@/components/FeedList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { channels } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Bookmark, Eye, Rss } from 'lucide-react';

// Import the Channel interface from FeedList to avoid duplication
interface Channel {
    id: number;
    title: string;
    description: string;
    url: string;
    channel_url: string;
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
    videos: Array<{
        id: number;
        title: string;
        published_at: string;
    }>;
    unseen_count: number;
}

interface Category {
    id: number;
    name: string;
    user_channels_count: number;
}

interface ChannelsProps {
    channels: Channel[];
    categories: Category[];
    stats: {
        totalChannels: number;
        unseenCount: number;
        savedCount: number;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Sources',
        href: channels().url,
    },
];

export default function Channels({
    channels: channelsData,
    categories,
    stats,
}: ChannelsProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sources" />
            <div className="container mx-auto space-y-6 px-6 py-6">
                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total Sources
                            </CardTitle>
                            <Rss className="h-4 w-4 text-muted-foreground transition-transform group-hover:scale-110" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.totalChannels}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                RSS subscriptions
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Unseen
                            </CardTitle>
                            <Eye className="h-4 w-4 text-muted-foreground transition-transform group-hover:scale-110" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.unseenCount}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Items to read
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Saved
                            </CardTitle>
                            <Bookmark className="h-4 w-4 text-muted-foreground transition-transform group-hover:scale-110" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {stats.savedCount}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Saved for later
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <FeedList channels={channelsData} categories={categories} />
            </div>
        </AppLayout>
    );
}
