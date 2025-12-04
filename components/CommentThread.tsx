import React, { useState } from 'react';
import type { Comment } from '../types';

interface CommentThreadProps {
  comments: Comment[];
  onAddComment: (text: string) => void;
}

const SingleComment: React.FC<{ comment: Comment }> = ({ comment }) => {
    const isAgent = comment.author === 'AI Agent';
    return (
        <div className={`flex items-start gap-3 ${isAgent ? '' : 'ml-8'}`}>
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${isAgent ? 'bg-blue-500' : 'bg-green-500'}`}>
                <span className="text-white font-bold text-sm">{isAgent ? 'AI' : 'R'}</span>
            </div>
            <div className="bg-gray-100 rounded-lg p-3 w-full border border-gray-200">
                <p className="text-gray-800 text-sm">{comment.text}</p>
                <p className="text-xs text-gray-500 mt-2 text-right">{new Date(comment.timestamp).toLocaleString()}</p>
            </div>
        </div>
    );
};


export const CommentThread: React.FC<CommentThreadProps> = ({ comments, onAddComment }) => {
  const [newComment, setNewComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold text-gray-800 mb-2">Comments</h4>
      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
        {comments.map((comment) => (
          <SingleComment key={comment.id} comment={comment} />
        ))}
        {comments.length === 0 && <p className="text-sm text-gray-500">No comments yet.</p>}
      </div>
      <form onSubmit={handleSubmit} className="mt-4">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment or reply..."
          className="w-full bg-white text-gray-800 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
        <div className="flex justify-end mt-2">
          <button
            type="submit"
            className="px-4 py-1.5 text-sm rounded-lg text-white font-semibold bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
};