import { writable } from 'svelte/store'

export const schools = writable([])
export const classesForEachSchool = writable({})
export const billingTargetCollection = writable('regular')
