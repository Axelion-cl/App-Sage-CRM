'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

export default function DateSelector() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Obtener fecha seleccionada de la URL o usar hoy
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
    const selectedDate = searchParams.get('date') || todayStr

    // Límites: hoy y 30 días atrás
    const minDate = new Date()
    minDate.setDate(minDate.getDate() - 30)
    const minDateStr = minDate.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })

    const isToday = selectedDate === todayStr
    const isAtLimit = selectedDate <= minDateStr

    function navigateToDate(dateStr: string) {
        // Si la fecha es hoy, quitar el param para URL limpia
        if (dateStr === todayStr) {
            router.push('/dashboard')
        } else {
            router.push(`/dashboard?date=${dateStr}`)
        }
    }

    function goToPreviousDay() {
        const current = new Date(selectedDate + 'T12:00:00')
        current.setDate(current.getDate() - 1)
        const newDate = current.toLocaleDateString('en-CA')
        if (newDate >= minDateStr) {
            navigateToDate(newDate)
        }
    }

    function goToNextDay() {
        const current = new Date(selectedDate + 'T12:00:00')
        current.setDate(current.getDate() + 1)
        const newDate = current.toLocaleDateString('en-CA')
        if (newDate <= todayStr) {
            navigateToDate(newDate)
        }
    }

    // Formatear la fecha para mostrar bonito
    const displayDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })

    return (
        <div className="flex items-center gap-3">
            {/* Botón Día Anterior */}
            <button
                onClick={goToPreviousDay}
                disabled={isAtLimit}
                className="p-2 rounded-xl glass border border-slate-800 hover:border-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Día anterior"
            >
                <ChevronLeft className="w-5 h-5 text-slate-300" />
            </button>

            {/* Selector de Fecha */}
            <div className="relative flex items-center gap-2 glass px-4 py-2 rounded-xl border border-slate-800">
                <Calendar className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-slate-200 capitalize">
                    {isToday ? `Hoy — ${displayDate}` : displayDate}
                </span>
                <input
                    type="date"
                    value={selectedDate}
                    min={minDateStr}
                    max={todayStr}
                    onChange={(e) => navigateToDate(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                />
            </div>

            {/* Botón Día Siguiente */}
            <button
                onClick={goToNextDay}
                disabled={isToday}
                className="p-2 rounded-xl glass border border-slate-800 hover:border-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Día siguiente"
            >
                <ChevronRight className="w-5 h-5 text-slate-300" />
            </button>
        </div>
    )
}
