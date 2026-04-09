'use client';

import { FeedList } from '@/components/FeedList';
import { CategoryForm } from '@/components/CategoryForm';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { sources } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Bookmark, ChevronRight, Edit, Eye, ExternalLink, Info, Rss, Tag, Trash2 } from 'lucide-react';
import { useState } from 'react';

// Import the Channel interface from FeedList to avoid duplication
interface Channel {
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

interface CategoryWithFeeds {
    id: number | string | null;
    name: string;
    user_channels_count: number;
    feeds?: Feed[];
}

interface Feed {
    id: number;
    title: string;
    url: string;
}

interface SourcesProps {
    channels: Channel[];
    categories: Category[];
    categoriesWithFeeds: CategoryWithFeeds[];
    stats: {
        totalChannels: number;
        unseenCount: number;
        savedCount: number;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Sources',
        href: sources().url,
    },
];

export default function Sources({
    channels: channelsData,
    categories,
    categoriesWithFeeds,
    stats,
}: SourcesProps) {
    const [expandedCategories, setExpandedCategories] = useState<Set<number | string | null>>(new Set());

    const toggleCategory = (categoryId: number | string | null) => {
        setExpandedCategories((prev) => {
            const next = new Set(prev);
            if (next.has(categoryId)) {
                next.delete(categoryId);
            } else {
                next.add(categoryId);
            }
            return next;
        });
    };

    const handleDeleteCategory = (categoryId: number | string | null) => {
        if (categoryId === null || categoryId === 'podcasts') {
            return;
        }

        if (confirm('Are you sure you want to delete this category? Feeds will be moved to uncategorized.')) {
            router.delete(`/categories/${categoryId}`, {
                onSuccess: () => {
                    router.reload();
                },
                onError: (errors) => {
                    console.error('Failed to delete category:', errors);
                },
            });
        }
    };

    const handleEditCategory = (categoryId: number, currentName: string) => {
        const newName = prompt('Enter new category name:', currentName);
        if (newName && newName.trim() && newName !== currentName) {
            router.put(`/categories/${categoryId}`, {
                name: newName.trim(),
            }, {
                onSuccess: () => {
                    router.reload();
                },
                onError: (errors) => {
                    console.error('Failed to update category:', errors);
                },
            });
        }
    };
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

                {/* Tabs */}
                <Tabs defaultValue="all">
                    <TabsList>
                        <TabsTrigger value="all">All Sources</TabsTrigger>
                        <TabsTrigger value="categories">By Category</TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="mt-6">
                        <FeedList sources={channelsData} categories={categories} />
                    </TabsContent>

                    <TabsContent value="categories" className="mt-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight">
                                    Categories
                                </h2>
                                <p className="text-muted-foreground">
                                    Organize your sources by category
                                </p>
                            </div>
                            <CategoryForm />
                        </div>

                        {categories.length === 0 ? (
                            <div className="rounded-lg border py-12 text-center">
                                <Tag className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                                <h3 className="mb-2 text-lg font-semibold">
                                    No categories yet
                                </h3>
                                <p className="mb-4 text-muted-foreground">
                                    Create your first category to organize your sources
                                </p>
                                <CategoryForm />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {categoriesWithFeeds.map((category: CategoryWithFeeds) => (
                                    <div key={category.id} className="rounded-lg border">
                                        <button
                                            onClick={() => category.feeds && category.feeds.length > 0 && toggleCategory(category.id)}
                                            className={`w-full flex items-center justify-between px-6 py-4 transition-colors ${
                                                category.feeds && category.feeds.length > 0 ? 'hover:bg-muted/50 cursor-pointer' : 'cursor-default'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {category.feeds && category.feeds.length > 0 && (
                                                    <ChevronRight
                                                        className={`h-4 w-4 transition-transform ${
                                                            expandedCategories.has(category.id) ? 'rotate-90' : ''
                                                        }`}
                                                    />
                                                )}
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">
                                                        {category.name}
                                                    </span>
                                                    {category.name === 'Podcasts' && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>This category is always available for podcast feeds.</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                </div>
                                                {category.feeds && category.feeds.length > 0 && (
                                                    <span className="text-sm text-muted-foreground">
                                                        ({category.user_channels_count})
                                                    </span>
                                                )}
                                            </div>
                                            {category.id !== null && category.name !== 'Podcasts' && (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditCategory(category.id as number, category.name);
                                                        }}
                                                        className="p-2 hover:bg-muted rounded"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteCategory(category.id);
                                                        }}
                                                        className="p-2 hover:bg-destructive/10 hover:text-destructive rounded"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </button>

                                        {expandedCategories.has(category.id) && category.feeds && category.feeds.length > 0 && (
                                            <div className="border-t bg-muted/30 px-6 py-3">
                                                <div className="space-y-2 pl-5">
                                                    {category.feeds.map((feed: Feed) => (
                                                        <div
                                                            key={feed.id}
                                                            onClick={() =>
                                                                router.visit(
                                                                    `/sources/${feed.id}`,
                                                                )
                                                            }
                                                            className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                        >
                                                            <ExternalLink className="h-3 w-3" />
                                                            <span className="truncate">
                                                                {feed.title}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
