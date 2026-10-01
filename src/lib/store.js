import { writable } from 'svelte/store'

export const schools = writable([])
export const classesForEachSchool = writable({})
export const billingTargetCollection = writable('regular')

// A success message for the next page to show, e.g. after deleting and going back to a list.
export const flashMessage = writable('')
