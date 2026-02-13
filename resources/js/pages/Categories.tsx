"use client";

import { CategoryForm } from "@/components/CategoryForm";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Plus, Tag } from "lucide-react";
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';

interface Category {
  id: number | null;
  name: string;
  user_feeds_count: number;
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
  const handleDeleteCategory = (categoryId: number | null) => {
    if (categoryId === null) {
      // Cannot delete uncategorized category
      return;
    }
    
    if (confirm('Are you sure you want to delete this category? Feeds will be moved to uncategorized.')) {
      router.delete(`/categories/${categoryId}`, {
        onSuccess: () => {
          router.reload();
        },
        onError: (errors) => {
          console.error('Failed to delete category:', errors);
        }
      });
    }
  };

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Categories" />
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
            <p className="text-muted-foreground">
              Manage your categories to organize your feeds
            </p>
          </div>
          <CategoryForm />
        </div>

        {/* Categories */}
        {categories.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <Tag className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No categories yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first category to organize your feeds
            </p>
            <CategoryForm />
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[1fr_120px_120px] gap-4 px-6 py-3 bg-muted/50 font-medium text-sm text-muted-foreground">
              <div>Category</div>
              <div>Feeds</div>
              <div>Actions</div>
            </div>
            
            {/* Table Body */}
            <div className="divide-y">
              {categories.map((category) => (
                <div key={category.id || 'uncategorized'} className="grid grid-cols-[1fr_120px_120px] gap-4 px-6 py-4 hover:bg-muted/50 transition-colors items-center">
                  <div>
                    <div className="font-medium">{category.name}</div>
                  </div>
                  <div>
                    <span className="text-sm">
                      {category.user_feeds_count} feed{category.user_feeds_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      {category.id !== null && (
                        <>
                          <CategoryForm 
                            category={category}
                            trigger={
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteCategory(category.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
