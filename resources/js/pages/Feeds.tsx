"use client";

import { FeedList } from "@/components/FeedList";
import AppLayout from '@/layouts/app-layout';
import { feeds } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

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
    color: string | null;
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
  color: string | null;
  user_feeds_count: number;
}

interface FeedsProps {
  feeds: Feed[];
  categories: Category[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Feeds',
        href: feeds().url,
    },
];

export default function Feeds({ feeds: feedsData, categories }: FeedsProps) {
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Feeds" />
      <div className="container mx-auto px-6 py-6">
        <FeedList feeds={feedsData} categories={categories} />
      </div>
    </AppLayout>
  );
}
