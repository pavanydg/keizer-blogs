import type { SQLiteSelectQueryBuilder } from "drizzle-orm/sqlite-core";
import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { like, or, sql } from "drizzle-orm";

import { db } from "../../db";
import { BlogTable } from "../../db/schema/blog";

// Helper function for pagination
function withPagination<T extends SQLiteSelectQueryBuilder>(
  qb: T,
  page: number,
  pageSize: number,
) {
  return qb.limit(pageSize).offset((page - 1) * pageSize);
}

export const blogs = {
  fetchBlogs: defineAction({
    input: z.object({
      page: z.number().min(1).default(1), // Enforce minimum page of 1
      pageSize: z.number().min(1).max(50).default(10), // Limit pageSize to a maximum (optional)
      search: z.string().optional(),
    }),
    handler: async ({ page, pageSize, search }) => {
      // Base query
      let query = db
        .select()
        .from(BlogTable)
        .orderBy(sql`${BlogTable.createdAt} DESC`)
        .$dynamic();

      // Add search condition if provided
      if (search) {
        query = query.where(
          or(
            like(BlogTable.title, `%${search}%`),
            like(BlogTable.body, `%${search}%`),
            like(BlogTable.authorId, `%${search}%`),
          ),
        );
      }

      // Apply pagination
      const paginatedQuery = withPagination(query, page, pageSize);
      const blogs = await paginatedQuery.execute();

      // Total count query
      let countQuery = db
        .select({ value: sql<number>`COUNT(*)` })
        .from(BlogTable)
        .$dynamic();

      if (search) {
        countQuery = countQuery.where(
          or(
            like(BlogTable.title, `%${search}%`),
            like(BlogTable.body, `%${search}%`),
            like(BlogTable.authorId, `%${search}%`),
          ),
        );
      }

      const [{ value: total }] = await countQuery.execute();

      return { blogs, total };
    },
  }),
};
