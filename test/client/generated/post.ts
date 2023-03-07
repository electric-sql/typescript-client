import * as z from 'zod'
/*
import { toZod } from 'tozod'

export type PostT = {
  id: string
  title: string
  contents: string
  nbr: number
}
*/

export const Post = z
  .object({
    /**
     * The unique identifier for the post
     * @default {Generated by database}
     */
    id: z.string(),
    /**
     * A brief title that describes the contents of the post
     */
    title: z.string(),
    /**
     * The actual contents of the post.
     */
    contents: z.string(),
    nbr: z.number().int(),
  })
  .strict()
