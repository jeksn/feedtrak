"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { router } from "@inertiajs/react";

interface Category {
  id: number;
  name: string;
  color: string | null;
}

interface CategoryAssignProps {
  feedId: number;
  currentCategory: Category | null;
  categories: Category[];
}

export function CategoryAssign({ feedId, currentCategory, categories }: CategoryAssignProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(
    currentCategory?.id.toString() || "none"
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAssignCategory = () => {
    setIsUpdating(true);
    
    const categoryId = selectedCategory === "none" ? null : parseInt(selectedCategory);
    
    router.put(`/feeds/${feedId}/category`, {
      category_id: categoryId,
    }, {
      onSuccess: () => {
        setIsUpdating(false);
        router.reload();
      },
      onError: (errors) => {
        console.error('Failed to assign category:', errors);
        setIsUpdating(false);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No category</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id.toString()}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        onClick={handleAssignCategory}
        disabled={isUpdating || (selectedCategory === currentCategory?.id.toString() || (selectedCategory === "none" && !currentCategory))}
      >
        {isUpdating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Assign"
        )}
      </Button>
    </div>
  );
}
