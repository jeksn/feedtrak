"use client";

import { useState } from "react";
import { router } from "@inertiajs/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";

const formSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
  category_mode: z.enum(["existing", "new"]),
  category_id: z.string().optional(),
  new_category: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Category {
  id: number;
  name: string;
}

interface FeedFormProps {
  categories: Category[];
}

export function FeedForm({ categories }: FeedFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
      category_mode: "existing",
      category_id: "",
      new_category: "",
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const categoryMode = form.watch("category_mode");

  const onSubmit = (data: FormData) => {
    console.log('Submitting feed form:', data);
    setIsSubmitting(true);

    const payload: { url: string; category_id?: string; new_category?: string } = { url: data.url };

    if (data.category_mode === "new" && data.new_category?.trim()) {
      payload.new_category = data.new_category.trim();
    } else if (data.category_mode === "existing" && data.category_id) {
      payload.category_id = data.category_id;
    }

    router.post('/sources', payload, {
      onSuccess: (page) => {
        console.log('Feed added successfully:', page);
        toast({
          title: "Success",
          description: data.category_mode === "new" ? "Category created and feed added successfully!" : "Feed has been added successfully!",
        });
        form.reset();
        setOpen(false);
        router.reload();
      },
      onError: (errors) => {
        console.error('Feed validation errors:', errors);
        if (errors.url) {
          if (errors.url.includes('youtube') || errors.url.includes('YouTube')) {
            toast({
              title: "YouTube Channel Error",
              description: "Couldn't fetch the YouTube source. Please check the URL and try again.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error",
              description: errors.url,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Error",
            description: "Failed to add feed. Please check the URL and try again.",
            variant: "destructive",
          });
        }
      },
      onFinish: () => {
        setIsSubmitting(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Feed
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Feed</DialogTitle>
          <DialogDescription>
            Add a YouTube channel, RSS feed, or podcast to track content. Enter the feed URL to get started.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feed URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://www.youtube.com/@channelname or https://example.com/feed.xml"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter a YouTube source URL, RSS feed, or podcast feed
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category_mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        {...field}
                        value="existing"
                        checked={field.value === "existing"}
                        className="accent-primary"
                      />
                      <span className="text-sm">Select existing</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        {...field}
                        value="new"
                        checked={field.value === "new"}
                        className="accent-primary"
                      />
                      <span className="text-sm">Create new</span>
                    </label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {categoryMode === "existing" ? (
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Category (Optional)</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === 'none' ? null : value)} defaultValue={field.value || 'none'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No category</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Organize your feeds into categories
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="new_category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Category Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter category name"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Create a new category for this feed
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Feed"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
