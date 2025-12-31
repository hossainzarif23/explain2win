/**
 * Audio Upload API Route
 *
 * Handles audio file uploads to S3
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/server/auth/auth.config';
import { uploadToS3 } from '@/server/storage/aws';

/**
 * GET - Not implemented
 */
export async function GET() {
  return NextResponse.json({ error: 'Method not implemented' }, { status: 501 });
}

/**
 * POST - Direct upload to S3 using centralized helper
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('audio') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Use the centralized AWS storage helper
    const { url, key } = await uploadToS3(
      buffer,
      file.name,
      file.type || 'audio/webm'
    );

    return NextResponse.json({ url, key });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
