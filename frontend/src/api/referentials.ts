import { api } from './client'
import type { Agency, Country, Nationality } from '../types'

function crud<T, TPayload>(base: string) {
  return {
    list: () => api.get<T[]>(base),
    listActive: () => api.get<T[]>(`${base}/active`),
    create: (payload: TPayload) => api.post<T>(base, payload),
    update: (id: number, payload: TPayload) => api.put<T>(`${base}/${id}`, payload),
    remove: (id: number) => api.delete<void>(`${base}/${id}`),
  }
}

export type AgencyPayload = Omit<Agency, 'id'>
export type NationalityPayload = Omit<Nationality, 'id'>
export type CountryPayload = Omit<Country, 'id'>

export const agenciesApi = crud<Agency, AgencyPayload>('/api/agencies')
export const nationalitiesApi = crud<Nationality, NationalityPayload>('/api/nationalities')
export const countriesApi = crud<Country, CountryPayload>('/api/countries')
