import * as React from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export interface Step {
  id: string
  title: string
  description?: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
  orientation?: 'horizontal' | 'vertical'
  className?: string
}

export function Stepper({ steps, currentStep, orientation = 'horizontal', className }: StepperProps) {
  return (
    <div
      className={cn('flex', orientation === 'vertical' ? 'flex-col space-y-4' : 'items-center space-x-4', className)}
    >
      {steps.map((step, index) => {
        const isActive = index === currentStep
        const isCompleted = index < currentStep
        const isLast = index === steps.length - 1

        return (
          <div
            key={step.id}
            className={cn(
              'flex',
              orientation === 'vertical' ? 'flex-col' : 'items-center',
              orientation === 'horizontal' && !isLast && 'flex-1',
            )}
          >
            <div className={cn('flex', orientation === 'vertical' ? 'items-start space-x-4' : 'flex-col items-center')}>
              <div className="relative">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full border-2 flex items-center justify-center font-medium transition-colors',
                    isCompleted
                      ? 'bg-[#62BFAA] border-[#62BFAA] text-white'
                      : isActive
                        ? 'border-[#62BFAA] text-[#62BFAA] bg-white'
                        : 'border-gray-300 text-gray-500 bg-white',
                  )}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : <span>{index + 1}</span>}
                </div>
              </div>
              <div className={cn('flex flex-col', orientation === 'vertical' ? 'flex-1' : 'mt-2 text-center')}>
                <h3
                  className={cn('text-sm font-medium transition-colors', isActive ? 'text-gray-900' : 'text-gray-500')}
                >
                  {step.title}
                </h3>
                {step.description && <p className="text-xs text-gray-500 mt-1">{step.description}</p>}
              </div>
            </div>
            {!isLast && orientation === 'vertical' && (
              <div className={cn('w-0.5 h-12 ml-5 transition-colors', isCompleted ? 'bg-[#62BFAA]' : 'bg-gray-200')} />
            )}
            {!isLast && orientation === 'horizontal' && (
              <div className={cn('flex-1 h-0.5 transition-colors', isCompleted ? 'bg-[#62BFAA]' : 'bg-gray-200')} />
            )}
          </div>
        )
      })}
    </div>
  )
}
