"use client";

import { EntryList } from "@/components/EntryList";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { ArrowLeft, RefreshCw, CheckCheck, Loader2 } from "lucide-react";
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState } from "react";

interface Feed {
  id: number;
  title: string;
  description: string;
  url: string;
  feed_url: string;
  type: string;
  icon_url: string | null;
  last_fetched_at: string | null;
  category: {
    id: number;
    name: string;
  } | null;
  unread_count: number;
}

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

interface FeedDetailProps {
  feed: Feed;
  entries: Entry[];
}

export default function FeedDetail({ feed, entries }: FeedDetailProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.post(`/feeds/${feed.id}/refresh`, {}, {
      onSuccess: () => {
        setIsRefreshing(false);
        router.reload();
      },
      onError: () => {
        setIsRefreshing(false);
      }
    });
  };

  const handleMarkAllAsRead = () => {
    router.post(`/feeds/${feed.id}/mark-all-read`, {}, {
      onSuccess: () => {
        router.reload();
      }
    });
  };

  const breadcrumbs: BreadcrumbItem[] = [
    {
      title: 'Feeds',
      href: '/feeds',
    },
    {
      title: feed.title,
      href: `/feeds/${feed.id}`,
    },
  ];

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={feed.title} />
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.visit('/feeds')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Feeds
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">{feed.title}</h1>
            <p className="text-muted-foreground">{feed.description}</p>
          </div>
        </div>

        {/* Feed Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {feed.category && (
                    <Badge
                      variant="secondary"
                    >
                      {feed.category.name}
                    </Badge>
                  )}
                  {feed.unread_count > 0 && (
                    <Badge variant="outline">
                      {feed.unread_count} unread
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Source: <a href={feed.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">{feed.url}</a></div>
                  {feed.last_fetched_at && (
                    <div>Last updated: {new Date(feed.last_fetched_at).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={feed.unread_count === 0}
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark All as Read
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Entries */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Recent Entries {entries.length > 0 && `(${entries.length})`}
          </h2>
          <EntryList entries={entries} feedId={feed.id} />
        </div>
      </div>
    </AppLayout>
  );
}
