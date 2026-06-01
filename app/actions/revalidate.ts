'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { headers } from 'next/headers';

async function checkAuth() {
  const headersList = await headers();
  const secret = headersList.get('Authorization')?.split('Bearer ')[1] || headersList.get('x-cron-secret');
  
  if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    throw new Error('Unauthorized revalidation request');
  }
}

export async function revalidatePage(path: string, type?: 'page' | 'layout') {
  try {
    await checkAuth();
    revalidatePath(path, type);
    return { success: true };
  } catch (error) {
    console.error(`Failed to revalidate path: ${path}`, error);
    return { success: false, error: String(error) };
  }
}

export async function revalidateCacheTag(tag: string) {
  try {
    await checkAuth();
    revalidateTag(tag, 'max');
    return { success: true };
  } catch (error) {
    console.error(`Failed to revalidate tag: ${tag}`, error);
    return { success: false, error: String(error) };
  }
}
