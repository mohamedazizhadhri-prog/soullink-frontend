import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Smile, Image as ImageIcon, Send, X, Gift } from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { Grid } from '@giphy/react-components';
import { GiphyFetch } from '@giphy/js-fetch-api';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './MessageInput.module.css';

// GIPHY API Key Management
// It is highly recommended to create a .env.local file in the root directory and add:
// NEXT_PUBLIC_GIPHY_API_KEY=your_actual_key_here
const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || 'hw2xhvRKz30YKLkvzEx4wdEeF2fAXaLo';
const gf = new GiphyFetch(GIPHY_API_KEY);

interface MessageInputProps {
  placeholder?: string;
  onSend: (content: string, attachment?: File, gifUrl?: string) => void;
  replyingTo?: any;
  onCancelReply?: () => void;
  disabled?: boolean;
}

export function MessageInput({
  placeholder = "Type a message...",
  onSend,
  replyingTo,
  onCancelReply,
  disabled = false
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState('');

  const emojiRef = useRef<HTMLDivElement>(null);
  const gifRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close pickers on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (gifRef.current && !gifRef.current.contains(event.target as Node)) {
        setShowGifPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachment(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() && !attachment) return;

    onSend(content, attachment || undefined);

    // Clear state
    setContent('');
    removeAttachment();
    if (onCancelReply) onCancelReply();
  };

  const onEmojiClick = (emojiData: any) => {
    setContent(prev => prev + emojiData.emoji);
    // Keep picker open for more emojis? Usually yes for UX, but mobile might want to close.
  };

  const fetchGifs = useCallback((offset: number) =>
    gifSearch
      ? gf.search(gifSearch, { offset, limit: 10 })
      : gf.trending({ offset, limit: 10 }),
    [gifSearch]);

  const onGifClick = (gif: any, e: React.SyntheticEvent) => {
    e.preventDefault();
    onSend('', undefined, gif.images.fixed_height.url);
    setShowGifPicker(false);
    if (onCancelReply) onCancelReply();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={styles.inputArea}>
      <div className={styles.inputContainer}>
        {/* Reply Preview */}
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className={styles.replyPreview}
            >
              <div className={styles.replyPreviewInfo}>
                <span>Replying to</span>
                <span className={styles.replyUser}>@{replyingTo.author?.handle || replyingTo.sender?.handle}</span>
              </div>
              <button className={styles.cancelReply} onClick={onCancelReply}>
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attachment Preview */}
        <AnimatePresence>
          {attachmentPreview && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={styles.attachmentPreview}
            >
              <img src={attachmentPreview} alt="Preview" />
              <button className={styles.removeAttachment} onClick={removeAttachment}>
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className={styles.inputWrapper}>
          <div className={styles.actionBtn}>
            <Plus size={20} />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className={styles.fileHidden}
              accept="image/*,video/*,.pdf,.doc,.docx"
            />
          </div>

          <div style={{ position: 'relative' }} ref={emojiRef}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile size={20} />
            </button>
            {showEmojiPicker && (
              <div className={`${styles.pickerOverlay} ${styles.emojiPicker}`}>
                <EmojiPicker
                  theme={Theme.DARK}
                  onEmojiClick={onEmojiClick}
                  lazyLoadEmojis={true}
                  searchPlaceholder="Search emojis..."
                />
              </div>
            )}
          </div>

          <div style={{ position: 'relative' }} ref={gifRef}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => setShowGifPicker(!showGifPicker)}
            >
              <Gift size={20} />
            </button>
            {showGifPicker && (
              <div className={`${styles.pickerOverlay} ${styles.gifPicker}`}>
                <div className={styles.gifHeader}>
                  <input
                    type="text"
                    className={styles.gifSearchInput}
                    placeholder="Search GIPHY..."
                    value={gifSearch}
                    onChange={(e) => setGifSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className={styles.gifContainer}>
                  <Grid
                    width={330}
                    columns={2}
                    fetchGifs={fetchGifs}
                    onGifClick={onGifClick}
                    key={gifSearch} // Re-mount grid on search change
                    onGifsFetchError={(err: Error) => console.error("Giphy Fetch Error:", err)}
                  />
                </div>
              </div>
            )}
          </div>

          <textarea
            className={styles.inputField}
            placeholder={placeholder}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={1}
          />

          <button
            type="submit"
            className={`${styles.actionBtn} ${styles.sendBtn} ${(content.trim() || attachment) ? styles.sendBtnActive : ''}`}
            disabled={(!content.trim() && !attachment) || disabled}
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
