import type { Post, PostType } from './data';
import { supabase } from './supabase';

type Row = {
  id: string;
  author_id: string;
  author_name: string;
  type: PostType;
  text: string;
  image_url: string | null;
  created_at: string;
  comments: { id: string; author_id: string; author_name: string; text: string; created_at: string }[];
  post_likes: { user_id: string }[];
};

const toPost = (r: Row): Post => ({
  id: r.id,
  authorId: r.author_id,
  authorName: r.author_name,
  type: r.type,
  text: r.text,
  imageUri: r.image_url ?? undefined,
  likes: r.post_likes.map((l) => l.user_id),
  comments: r.comments
    .map((c) => ({ id: c.id, authorId: c.author_id, authorName: c.author_name, text: c.text, at: Date.parse(c.created_at) }))
    .sort((a, b) => a.at - b.at),
  at: Date.parse(r.created_at),
});

/** Shared community feed stored in Supabase (`posts`, `comments`, `post_likes`). */
export async function fetchPosts(): Promise<Post[]> {
  const { data, error } = await supabase!
    .from('posts')
    .select('*, comments(*), post_likes(user_id)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data as Row[]).map(toPost);
}

export async function createPost(p: { authorId: string; authorName: string; type: PostType; text: string; imageUrl?: string }) {
  const { error } = await supabase!
    .from('posts')
    .insert({ author_id: p.authorId, author_name: p.authorName, type: p.type, text: p.text, image_url: p.imageUrl ?? null });
  if (error) throw error;
}

export async function setLike(postId: string, userId: string, liked: boolean) {
  const q = liked
    ? supabase!.from('post_likes').insert({ post_id: postId, user_id: userId })
    : supabase!.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
  const { error } = await q;
  if (error) throw error;
}

export async function createComment(postId: string, authorId: string, authorName: string, text: string) {
  const { error } = await supabase!.from('comments').insert({ post_id: postId, author_id: authorId, author_name: authorName, text });
  if (error) throw error;
}
