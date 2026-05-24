'use server';

import { createClient } from '@/app/lib/supabase/server';

export async function saveChatMessage(
  userId: string,
  messageId: string,
  sender: 'student' | 'assistant',
  text: string,
  recommendations?: any[]
) {
  const supabase = createClient();

  const { error } = await supabase
    .from('AiChatHistory')
    .insert({
      user_id: userId,
      message_id: messageId,
      sender,
      text,
      created_at: new Date().toISOString(),
      recommendations: recommendations || null,
    });

  if (error) {
    console.error('Error saving chat message:', error);
    throw new Error('Failed to save chat message');
  }
}

export async function loadChatMessages(userId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('AiChatHistory')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading chat messages:', error);
    throw new Error('Failed to load chat messages');
  }

  return data;
}

export async function clearChatMessages(userId: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from('AiChatHistory')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error clearing chat messages:', error);
    throw new Error('Failed to clear chat messages');
  }

  return { success: true };
}