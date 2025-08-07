import { type Config } from "drizzle-kit";

import { env } from "~/env";

const SCHEMA_DIR = "./src/server/db/";

export default {
  schema: `${SCHEMA_DIR}/schemas/*.ts`,
  out: `${SCHEMA_DIR}/migrations`,
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  tablesFilter: ["UTPS_*"],
} satisfies Config;
