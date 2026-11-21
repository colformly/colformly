import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().max(200),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string(),
    authorRole: z.string(),
    category: z.enum(['Security & Anti-Cheat', 'Architecture & Scale', 'Campus Governance']),
    tags: z.array(z.string()),
    readingTime: z.string(),
    heroImage: z.string(),
    heroImageAlt: z.string(),
    tldr: z.array(z.string()),
    keyStats: z.array(
      z.object({
        label: z.string(),
        value: z.string(),
      })
    ),
    faqs: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    ),
  }),
});

export const collections = {
  blog: blogCollection,
};
