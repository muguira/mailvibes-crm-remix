import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link, ExternalLink } from 'lucide-react'

interface LinkModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (url: string, text: string) => void
  selectedText?: string
}

export default function LinkModal({ isOpen, onClose, onConfirm, selectedText }: LinkModalProps) {
  const [url, setUrl] = useState('')
  const [linkText, setLinkText] = useState('')
  const [isValidUrl, setIsValidUrl] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setUrl('')
      setLinkText(selectedText || '')
      setIsValidUrl(false)
    }
  }, [isOpen, selectedText])

  const validateUrl = (urlString: string) => {
    try {
      // Add protocol if missing
      const urlWithProtocol =
        urlString.startsWith('http://') || urlString.startsWith('https://') ? urlString : `https://${urlString}`

      new URL(urlWithProtocol)
      return true
    } catch {
      return false
    }
  }

  const handleUrlChange = (value: string) => {
    setUrl(value)
    setIsValidUrl(validateUrl(value))
  }

  const handleConfirm = () => {
    if (url.trim() && linkText.trim()) {
      // Ensure URL has protocol
      const finalUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`

      onConfirm(finalUrl, linkText)
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && url.trim() && linkText.trim() && isValidUrl) {
      handleConfirm()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-5 h-5 text-teal-600" />
            Agregar enlace
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <div className="relative">
              <Input
                id="url"
                type="url"
                placeholder="https://ejemplo.com"
                value={url}
                onChange={e => handleUrlChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className={`pr-10 ${isValidUrl && url ? 'border-green-300 focus:border-green-500' : ''}`}
                autoFocus
              />
              {isValidUrl && url && (
                <ExternalLink className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />
              )}
            </div>
            {url && !isValidUrl && <p className="text-sm text-red-600">Por favor ingresa una URL válida</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkText">Texto del enlace</Label>
            <Input
              id="linkText"
              type="text"
              placeholder="Texto que se mostrará"
              value={linkText}
              onChange={e => setLinkText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          {url && isValidUrl && (
            <div className="bg-gray-50 p-3 rounded-md border">
              <p className="text-sm text-gray-600 mb-1">Vista previa:</p>
              <p className="text-sm">
                <span className="text-teal-600 underline">{linkText || url}</span>
                <span className="text-gray-400 ml-2">→ {url}</span>
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!url.trim() || !linkText.trim() || !isValidUrl}
            className="bg-teal-600 hover:bg-teal-700"
          >
            Agregar enlace
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
