'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirebase, useUser } from '@/firebase';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

import type { BlogPost } from '@/lib/definitions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { FormDescription } from '../ui/form';
import { uploadImage } from '@/lib/actions';

const blogPostSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters long.'),
  content: z.string().min(100, 'Content must be at least 100 characters long.'),
});

type BlogPostFormValues = z.infer<typeof blogPostSchema>;

interface BlogPostFormProps {
  post?: BlogPost; // For editing existing posts
}

export function BlogPostForm({ post }: BlogPostFormProps) {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(post?.imageUrl || null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<BlogPostFormValues>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: post?.title || '',
      content: post?.content || '',
    },
  });

  const isEditMode = !!post;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: BlogPostFormValues) => {
    if (!firestore || !user) {
      setError('You must be logged in to create a post.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      let imageUrl = post?.imageUrl || '';

      if (imageFile) {
        setIsUploading(true);
        const uploadFormData = new FormData();
        uploadFormData.append('image', imageFile);
        imageUrl = await uploadImage(uploadFormData);
        setIsUploading(false);
      } else if (!imagePreview) {
        imageUrl = '';
      }

      const postData: any = {
        ...data,
        authorId: user.id,
        authorName: user.name,
        authorAvatarUrl: user.avatarUrl,
        imageUrl: imageUrl,
        updatedAt: serverTimestamp(),
      };
      
      if (!isEditMode) {
          postData.createdAt = serverTimestamp();
          postData.likes = [];
      }

      if (isEditMode) {
        const postRef = doc(firestore, 'blogPosts', post.id);
        await updateDoc(postRef, postData);
        toast({ title: 'Success', description: 'Your post has been updated.' });
        router.push(`/blog/${post.id}`);
      } else {
        const docRef = await addDoc(collection(firestore, 'blogPosts'), postData);
        toast({ title: 'Success', description: 'Your post has been published.' });
        router.push(`/blog/${docRef.id}`);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to save post. You may not have the required permissions.');
      console.warn(e);
       if (e.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({ path: 'blogPosts', operation: isEditMode ? 'update' : 'create' });
          errorEmitter.emit('permission-error', permissionError);
      }
    } finally {
      setLoading(false);
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditMode ? 'Edit' : 'Create'} Blog Post</CardTitle>
        <CardDescription>
          {isEditMode ? 'Make changes to your post below.' : 'Share your thoughts and insights with the community.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Post Title</FormLabel>
                  <FormControl>
                    <Input placeholder="A catchy title for your article" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <FormLabel>Feature Image (Optional)</FormLabel>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="mt-2 file:text-foreground"
                disabled={isUploading}
              />
              {isUploading && <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4" /> Uploading...</p>}
              {imagePreview && (
                <div className="mt-4 relative w-full aspect-video">
                  <Image src={imagePreview} alt="Image preview" fill className="rounded-md object-cover" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 rounded-full"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <FormDescription className="mt-2">This image will be at the top of your post.</FormDescription>
            </div>

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Write your blog post here. Use markdown for formatting if you like."
                      className="min-h-[300px]"
                      {...field}
                    />
                  </FormControl>
                   <FormDescription>
                    At least 100 characters. Basic markdown is supported.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button type="submit" disabled={loading || isUploading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Save Changes' : 'Publish Post'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}