"use client";

import { useState } from "react";
import { router } from "@inertiajs/react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileText, Download } from "lucide-react";

interface OpmlImportProps {
  children: React.ReactNode;
}

export function OpmlImport({ children }: OpmlImportProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    
    router.post('/feeds/import-opml', formData, {
      onSuccess: (page) => {
        console.log('OPML imported successfully:', page);
        console.log('Page props:', page.props);
        toast({
          title: "Import Successful",
          description: (page.props as any).flash?.success || "Your feeds have been imported successfully!",
        });
        setOpen(false);
        
        // Reset the file input
        const input = document.getElementById('opml-file') as HTMLInputElement;
        if (input) {
          input.value = '';
        }
      },
      onError: (errors) => {
        console.error('OPML import errors:', errors);
        console.error('Errors object:', JSON.stringify(errors, null, 2));
        
        // Handle different types of errors
        if (errors.opml) {
          toast({
            title: "Import Failed",
            description: Array.isArray(errors.opml) ? errors.opml[0] : errors.opml,
            variant: "destructive",
          });
        } else if (errors.opml_file) {
          toast({
            title: "File Error",
            description: Array.isArray(errors.opml_file) ? errors.opml_file[0] : errors.opml_file,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Import Failed",
            description: "An unexpected error occurred. Please try again.",
            variant: "destructive",
          });
        }
        
        // Reset the file input on error
        const input = document.getElementById('opml-file') as HTMLInputElement;
        if (input) {
          input.value = '';
        }
      },
      onInvalidResponse: (response) => {
        console.error('Invalid response received:', response);
        console.error('Response status:', response.status);
        console.error('Response text:', response.text());
        toast({
          title: "Server Error",
          description: "The server returned an invalid response. Please check the logs.",
          variant: "destructive",
        });
        setIsSubmitting(false);
      },
      onFinish: () => {
        setIsSubmitting(false);
      }
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const input = document.getElementById('opml-file') as HTMLInputElement;
      if (input) {
        try {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          input.files = dataTransfer.files;
          
          // Trigger change event to validate
          const event = new Event('change', { bubbles: true });
          input.dispatchEvent(event);
        } catch (error) {
          console.error('Error handling dropped file:', error);
          toast({
            title: "File Error",
            description: "Failed to process the dropped file. Please try selecting it manually.",
            variant: "destructive",
          });
        }
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file extension
      const validExtensions = ['.xml', '.opml'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!validExtensions.includes(fileExtension)) {
        toast({
          title: "Invalid File",
          description: "Please select a valid OPML or XML file.",
          variant: "destructive",
        });
        e.target.value = '';
        return;
      }

      // Check file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "The file must be smaller than 10MB.",
          variant: "destructive",
        });
        e.target.value = '';
        return;
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Feeds from OPML</DialogTitle>
          <DialogDescription>
            Import your RSS feeds from an OPML file exported from another feed reader like Feedly, Feedbin, or Inoreader.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            className={cn(
              "relative border-2 border-dashed rounded-lg p-6 text-center transition-colors",
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              "hover:border-primary/50"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              id="opml-file"
              name="opml_file"
              type="file"
              accept=".xml,.opml"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              required
            />
            
            <div className="pointer-events-none">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium mb-2">
                {dragActive ? "Drop your OPML file here" : "Select or drop your OPML file"}
              </p>
              <p className="text-sm text-muted-foreground">
                Supports .xml and .opml files up to 10MB
              </p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">How to export OPML:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Feedbin:</strong> Settings → Import/Export → Export OPML</li>
              <li>• <strong>Feedly:</strong> Settings → OPML → Export as OPML</li>
              <li>• <strong>Inoreader:</strong> Preferences → Import/Export → Export OPML</li>
              <li>• <strong>Other readers:</strong> Look for "Export" or "OPML" in settings</li>
            </ul>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Feeds
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
