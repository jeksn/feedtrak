"use client";

import { FeedList } from "@/components/FeedList";
import AppLayout from '@/layouts/app-layout';
import { feeds } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Rss, Eye, Bookmark } from "lucide-react";

// Import the Feed interface from FeedList to avoid duplication
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
  user_feeds_count: number;
}

interface FeedsProps {
  feeds: Feed[];
  categories: Category[];
  stats: {
    totalFeeds: number;
    unreadCount: number;
    savedCount: number;
  };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Feeds',
        href: feeds().url,
    },
];

export default function Feeds({ feeds: feedsData, categories, stats }: FeedsProps) {
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Feeds" />
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Feeds</CardTitle>
              <Rss className="h-4 w-4 text-muted-foreground transition-transform group-hover:scale-110" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFeeds}</div>
              <p className="text-xs text-muted-foreground">
                RSS subscriptions
              </p>
            </CardContent>
          </Card>
          <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground transition-transform group-hover:scale-110" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unreadCount}</div>
              <p className="text-xs text-muted-foreground">
                Items to read
              </p>
            </CardContent>
          </Card>
          <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saved</CardTitle>
              <Bookmark className="h-4 w-4 text-muted-foreground transition-transform group-hover:scale-110" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.savedCount}</div>
              <p className="text-xs text-muted-foreground">
                Saved for later
              </p>
            </CardContent>
          </Card>
        </div>

        <FeedList feeds={feedsData} categories={categories} />
      </div>
    </AppLayout>
  );
}
