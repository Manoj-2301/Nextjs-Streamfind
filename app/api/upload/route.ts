import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // Prepare form data for ImgBB
    const imgbbFormData = new FormData();
    imgbbFormData.append('image', file);

    const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
    if (!IMGBB_API_KEY) {
      throw new Error("Missing NEXT_PUBLIC_IMGBB_API_KEY");
    }

    try {
      // PRIMARY UPLOAD: Attempt ImgBB
      const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: imgbbFormData,
      });

      if (!imgbbResponse.ok) {
        throw new Error(`ImgBB upload failed with status ${imgbbResponse.status}`);
      }

      const data = await imgbbResponse.json();
      return NextResponse.json({ url: data.data.url });

    } catch (imgbbError) {
      console.warn("ImgBB Upload Failed, falling back to Cloudinary...", imgbbError);

      // FALLBACK UPLOAD: Attempt Cloudinary
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset) {
        throw new Error("ImgBB failed and Cloudinary fallback is not configured in .env.local");
      }

      const cloudinaryData = new FormData();
      cloudinaryData.append('file', file);
      cloudinaryData.append('upload_preset', uploadPreset);

      const cloudResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: cloudinaryData,
      });

      if (!cloudResponse.ok) {
        throw new Error(`Cloudinary fallback upload failed with status ${cloudResponse.status}`);
      }

      const cloudJson = await cloudResponse.json();
      return NextResponse.json({ url: cloudJson.secure_url });
    }

  } catch (error: any) {
    console.error('Image upload proxy error:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload image' }, { status: 500 });
  }
}
