// Temporary workaround for development without database
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  console.log("⚠️  No DATABASE_URL found - using mock database for development");
  process.env.DATABASE_URL = "postgresql://localhost:5432/temp";
}

// Mock database connection for development
export const db = {
  select: () => ({
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve([])
      })
    })
  }),
  insert: () => ({
    values: () => ({
      returning: () => Promise.resolve([])
    })
  }),
  update: () => ({
    set: () => ({
      where: () => ({
        returning: () => Promise.resolve([])
      })
    })
  }),
  delete: () => ({
    where: () => Promise.resolve([])
  })
} as any;