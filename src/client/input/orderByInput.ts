export type SortOrder = 'asc' | 'desc'

/**
 * Type that represent a custom order for a type `T`
 * by setting zero or more of its fields to a `SortOrder`.
 * @template T Type to sort
 */
export type OrderByInput<T> = { [field in keyof T]?: SortOrder }