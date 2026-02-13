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
  category_id: z.string().optional(),
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
      category_id: "",
    },
  });

  const onSubmit = (data: FormData) => {
    console.log('Submitting feed form:', data);
    setIsSubmitting(true);
    
    router.post('/feeds', data, {
      onSuccess: (page) => {
        console.log('Feed added successfully:', page);
        toast({
          title: "Success",
          description: "Feed has been added successfully!",
        });
        form.reset();
        setOpen(false);
      },
      onError: (errors) => {
        console.error('Feed validation errors:', errors);
        // Show specific error to user
        if (errors.url) {
          // Check if it's a YouTube URL and provide specific help
          if (errors.url.includes('youtube') || errors.url.includes('YouTube')) {
            toast({
              title: "YouTube Channel Error",
              description: "Couldn't fetch the YouTube channel. Try using the channel's RSS feed URL directly: https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID",
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
          <DialogTitle>Add Feed or YouTube Channel</DialogTitle>
          <DialogDescription>
            Add a new RSS feed or YouTube channel to your collection. You can add feeds from blogs,
            news sites, or subscribe to YouTube channels directly.
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
                      placeholder="https://example.com/feed.xml or https://www.youtube.com/@channel"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter an RSS feed URL or a website URL. For YouTube channels, you can use the channel URL directly (e.g., youtube.com/@channelname or youtube.com/channel/CHANNEL_ID)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category (Optional)</FormLabel>
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
