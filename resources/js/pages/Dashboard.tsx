"use client";

import { useState } from "react";
import { EntryList } from "@/components/EntryList";
import { FeedForm } from "@/components/FeedForm";
import { type BreadcrumbItem, type SharedData } from "@/types";
import { Head, usePage } from "@inertiajs/react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2, Rss, Eye, Bookmark, BookOpen } from "lucide-react";
import AppLayout from "@/layouts/app-layout";
import { router } from "@inertiajs/react";
import { dashboard } from '@/routes';

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

interface DashboardProps {
  stats: {
    totalFeeds: number;
    unreadCount: number;
    savedCount: number;
  };
  entries: {
    all: Entry[];
    unread: Entry[];
    saved: Entry[];
  };
  categories: Array<{
    id: number;
    name: string;
    color: string | null;
  }>;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

export default function Dashboard({ stats, entries, categories }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("unread");
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);

  const handleRefreshAllFeeds = () => {
    setIsRefreshingAll(true);
    router.post('/entries/refresh-all', {}, {
      onSuccess: () => {
        router.reload();
      },
      onError: (errors) => {
        console.error('Failed to refresh feeds:', errors);
      },
      onFinish: () => {
        setIsRefreshingAll(false);
      }
    });
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Dashboard" />
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back! Here's what's new in your feeds.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRefreshAllFeeds}
              disabled={isRefreshingAll}
              className="gap-2"
            >
              {isRefreshingAll ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Refresh All Feeds
                </>
              )}
            </Button>
            <FeedForm categories={categories} />
          </div>
        </div>

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

        {/* Entries */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="unread" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Unread
              {stats.unreadCount > 0 && (
                <Badge variant="secondary">{stats.unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              All Items
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <Bookmark className="h-4 w-4" />
              Saved
              {stats.savedCount > 0 && (
                <Badge variant="secondary">{stats.savedCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unread">
            <EntryList entries={entries.unread} showUnreadOnly={true} />
          </TabsContent>

          <TabsContent value="all">
            <EntryList entries={entries.all} />
          </TabsContent>

          <TabsContent value="saved">
            <EntryList entries={entries.saved} showSaved={true} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
