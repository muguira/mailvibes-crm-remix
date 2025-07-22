import { useState } from 'react'
import { Avatar } from '@/components/shared/avatar'
import { CustomButton } from '@/components/ui/custom-button'
import { useAuth } from '@/components/auth'

interface CommentFormProps {
  onAddComment: (content: string) => void
}

export function CommentForm({ onAddComment }: CommentFormProps) {
  const [commentText, setCommentText] = useState('')
  const { user } = useAuth()

  const userInitials = user?.email ? user.email.substring(0, 2).toUpperCase() : 'US'

  const handlePostComment = () => {
    if (!commentText.trim()) return

    onAddComment(commentText)
    setCommentText('')
  }

  return (
    <div className="bg-white p-4 shadow-sm rounded-md">
      <div className="flex gap-3">
        <Avatar name={user?.email?.split('@')[0] || 'You'} initials={userInitials} />
        <div className="flex-1">
          <textarea
            placeholder="Add a comment or @mention a teammate..."
            className="w-full p-2 border border-slate-light/30 rounded text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-teal-primary/30 focus:border-teal-primary"
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
          />
          <div className="flex justify-end mt-2">
            <CustomButton size="sm" onClick={handlePostComment} disabled={!commentText.trim()}>
              Post Comment
            </CustomButton>
          </div>
        </div>
      </div>
    </div>
  )
}
