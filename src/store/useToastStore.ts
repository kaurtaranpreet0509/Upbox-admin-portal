import { create } from 'zustand'

type Toast = { id: string; message: string; tone: 'success' | 'error' }

type ToastState = {
  toasts: Toast[]
  push: (message: string, tone?: 'success' | 'error') => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push(message, tone = 'success') {
    const id = `t-${Date.now()}`
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }))
    window.setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 3200)
  },
  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))
