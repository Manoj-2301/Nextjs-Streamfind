'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

export async function revalidatePage(path: string, type?: 'page' | 'layout') {
  try {
    revalidatePath(path, type);
    return { success: true };
  } catch (error) {
    console.error(`Failed to revalidate path: ${path}`, error);
    return { success: false, error: String(error) };
  }
}

export async function revalidateCacheTag(tag: string) {
  try {
    revalidateTag(tag, 'max');
    return { success: true };
  } catch (error) {
    console.error(`Failed to revalidate tag: ${tag}`, error);
    return { success: false, error: String(error) };
  }
}
