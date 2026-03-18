'use client';

import { CategoryForm } from '@/components/CategoryForm';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ChevronRight, Edit, ExternalLink, Tag, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Feed {
    id: number;
    title: string;
    url: string;
}

interface Category {
    id: number | string | null;
    name: string;
    user_feeds_count: number;
    feeds?: Feed[];
}

interface CategoriesProps {
    categories: Category[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Categories',
        href: '/categories',
    },
];

export default function Categories({ categories }: CategoriesProps) {
    const [expandedCategories, setExpandedCategories] = useState<
        Set<number | string | null>
    >(new Set());

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
            // Cannot delete uncategorized or Podcasts category
            return;
        }

        if (
            confirm(
                'Are you sure you want to delete this category? Feeds will be moved to uncategorized.',
            )
        ) {
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Categories" />
            <div className="container mx-auto space-y-6 px-6 py-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Categories
                        </h1>
                        <p className="text-muted-foreground">
                            Manage your categories to organize your feeds
                        </p>
                    </div>
                    <CategoryForm />
                </div>

                {/* Categories */}
                {categories.length === 0 ? (
                    <div className="rounded-lg border py-12 text-center">
                        <Tag className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                        <h3 className="mb-2 text-lg font-semibold">
                            No categories yet
                        </h3>
                        <p className="mb-4 text-muted-foreground">
                            Create your first category to organize your feeds
                        </p>
                        <CategoryForm />
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-lg border">
                        {/* Table Header */}
                        <div className="grid grid-cols-[1fr_120px_120px] gap-4 bg-muted/50 px-6 py-3 text-sm font-medium text-muted-foreground">
                            <div>Category</div>
                            <div>Feeds</div>
                            <div>Actions</div>
                        </div>

                        {/* Table Body */}
                        <div className="divide-y">
                            {categories.map((category) => {
                                const isExpanded = expandedCategories.has(
                                    category.id,
                                );
                                return (
                                    <div key={category.id || 'uncategorized'}>
                                        <div
                                            className="grid cursor-pointer grid-cols-[1fr_120px_120px] items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/50"
                                            onClick={() =>
                                                toggleCategory(category.id)
                                            }
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="p-1">
                                                    <ChevronRight
                                                        className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                                    />
                                                </span>
                                                <span className="font-medium">
                                                    {category.name}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-sm">
                                                    {category.user_feeds_count}{' '}
                                                    feed
                                                    {category.user_feeds_count !==
                                                    1
                                                        ? 's'
                                                        : ''}
                                                </span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1">
                                                    {category.id !== null &&
                                                        category.name !==
                                                            'Podcasts' && (
                                                            <>
                                                                <CategoryForm
                                                                    category={{
                                                                        id:
                                                                            typeof category.id ===
                                                                            'number'
                                                                                ? category.id
                                                                                : null,
                                                                        name: category.name,
                                                                    }}
                                                                    trigger={
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                        >
                                                                            <Edit className="h-4 w-4" />
                                                                        </Button>
                                                                    }
                                                                />
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        handleDeleteCategory(
                                                                            category.id,
                                                                        )
                                                                    }
                                                                    className="text-destructive hover:text-destructive"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Expanded feeds list */}
                                        {isExpanded &&
                                            category.feeds &&
                                            category.feeds.length > 0 && (
                                                <div className="border-t bg-muted/30 px-6 py-3">
                                                    <div className="space-y-2 pl-5">
                                                        {category.feeds.map(
                                                            (feed) => (
                                                                <div
                                                                    key={
                                                                        feed.id
                                                                    }
                                                                    onClick={() =>
                                                                        router.visit(
                                                                            `/channels/${feed.id}`,
                                                                        )
                                                                    }
                                                                    className="flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                                >
                                                                    <ExternalLink className="h-3 w-3" />
                                                                    <span className="truncate">
                                                                        {
                                                                            feed.title
                                                                        }
                                                                    </span>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
