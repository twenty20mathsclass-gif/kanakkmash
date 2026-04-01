'use server';

import { generateCustomMathPractice } from '@/ai/flows/generate-custom-math-practice';
import type { GenerateCustomMathPracticeOutput } from '@/ai/flows/generate-custom-math-practice';
import { v2 as cloudinary } from 'cloudinary';



export async function generatePractice(
  topic: string,
  difficulty: string
): Promise<{ data: GenerateCustomMathPracticeOutput | null; error: string | null }> {
  try {
    const output = await generateCustomMathPractice({
      lessonTopic: topic,
      difficultyLevel: difficulty,
    });
    return { data: output, error: null };
  } catch (e) {
    console.error(e);
    return { data: null, error: 'Failed to generate practice questions. Please try again.' };
  }
}

/**
 * Uploads an image to Cloudinary and returns the secure URL.
 * Falls back to ImgBB if Cloudinary fails (e.g., 403 Forbidden).
 */
export async function uploadImage(formData: FormData): Promise<string> {
  const file = formData.get('image') as File;
  if (!file) throw new Error('No file provided for upload.');

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64Data = buffer.toString('base64');
  const fileUri = `data:${file.type};base64,${base64Data}`;

  // 1. Try Cloudinary First
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const result = await cloudinary.uploader.upload(fileUri, {
      folder: 'kanakkmash',
      resource_type: 'auto'
    });

    if (result && result.secure_url) {
      return result.secure_url;
    }
  } catch (cloudinaryError) {
    console.warn('Cloudinary failed, attempting fallback to ImgBB...', cloudinaryError);
  }

  // 2. Fallback to ImgBB
  try {
    const imgbbKey = process.env.IMAGE_UPLOAD_API_KEY || process.env.NEXT_PUBLIC_IMAGE_UPLOAD_API_KEY;
    if (!imgbbKey) throw new Error('No upload keys available.');

    const imgbbFormData = new URLSearchParams();
    imgbbFormData.append('image', base64Data);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
      method: 'POST',
      body: imgbbFormData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = await response.json();
    if (data.success) {
      return data.data.url;
    } else {
      console.error('ImgBB upload error:', data);
      throw new Error(data.error?.message || 'ImgBB upload failed.');
    }
  } catch (imgbbError: any) {
    console.error('Upload fallback failed:', imgbbError);
    throw new Error('Failed to upload image. Please check your internet connection and try again.');
  }
}