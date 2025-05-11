import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';

// Increased file size limit to 10MB to accommodate PDFs
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
];

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: `File size should be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    })
    .refine((file) => ALLOWED_FILE_TYPES.includes(file.type), {
      message: `File type should be one of: ${ALLOWED_FILE_TYPES.join(', ')}`,
    }),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.body === null) {
    return new Response('Request body is empty', { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename from formData since Blob doesn't have name property
    const filename = (formData.get('file') as File).name;

    // Clean the filename to avoid any potential issues
    const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Add a timestamp to prevent filename conflicts
    const timestamp = Date.now();
    const uniqueFilename = `${timestamp}-${cleanFilename}`;

    const fileBuffer = await file.arrayBuffer();

    try {
      const data = await put(uniqueFilename, fileBuffer, {
        access: 'public',
        contentType: file.type, // Ensure correct content type
      });

      // Add file type to response for better client-side handling
      return NextResponse.json({
        ...data,
        fileType: file.type,
      });
    } catch (error) {
      console.error('Blob upload error:', error);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}
