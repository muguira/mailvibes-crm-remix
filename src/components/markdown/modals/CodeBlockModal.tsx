import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Code2, FileCode } from 'lucide-react'

interface CodeBlockModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (code: string, language: string) => void
  selectedText?: string
}

// Popular programming languages for the dropdown
const POPULAR_LANGUAGES = [
  { value: 'none', label: 'Sin lenguaje específico' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'sql', label: 'SQL' },
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
  { value: 'bash', label: 'Bash/Shell' },
  { value: 'php', label: 'PHP' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'dart', label: 'Dart' },
]

export default function CodeBlockModal({ isOpen, onClose, onConfirm, selectedText }: CodeBlockModalProps) {
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('')
  const [customLanguage, setCustomLanguage] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setCode(selectedText || '')
      setLanguage('none')
      setCustomLanguage('')
      setShowCustomInput(false)
    }
  }, [isOpen, selectedText])

  const handleLanguageChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomInput(true)
      setLanguage('')
    } else {
      setShowCustomInput(false)
      setLanguage(value)
      setCustomLanguage('')
    }
  }

  const handleConfirm = () => {
    if (code.trim()) {
      const finalLanguage = showCustomInput ? customLanguage : language === 'none' ? '' : language
      onConfirm(code, finalLanguage)
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && code.trim()) {
      handleConfirm()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const getPreviewLanguage = () => {
    const lang = showCustomInput ? customLanguage : language
    return lang === 'none' ? '' : lang
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-teal-600" />
            Agregar bloque de código
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="language">Lenguaje de programación</Label>
            <Select value={showCustomInput ? 'custom' : language} onValueChange={handleLanguageChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un lenguaje (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {POPULAR_LANGUAGES.map(lang => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Otro lenguaje...</SelectItem>
              </SelectContent>
            </Select>

            {showCustomInput && (
              <Input
                placeholder="Escribe el nombre del lenguaje"
                value={customLanguage}
                onChange={e => setCustomLanguage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="mt-2"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Código</Label>
            <Textarea
              id="code"
              placeholder="Escribe o pega tu código aquí..."
              value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[200px] font-mono text-sm"
              autoFocus
            />
            <p className="text-xs text-gray-500">
              Tip: Usa Ctrl+Enter (Cmd+Enter en Mac) para agregar el bloque rápidamente
            </p>
          </div>

          {code && (
            <div className="bg-gray-50 p-3 rounded-md border">
              <p className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                <FileCode className="w-4 h-4" />
                Vista previa:
              </p>
              <div className="bg-gray-100 p-3 rounded border">
                {getPreviewLanguage() && <div className="text-xs text-gray-500 mb-1">{getPreviewLanguage()}</div>}
                <pre className="text-sm font-mono text-gray-800 whitespace-pre-wrap">
                  {code.slice(0, 200)}
                  {code.length > 200 ? '...' : ''}
                </pre>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!code.trim()} className="bg-teal-600 hover:bg-teal-700">
            Agregar código
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
