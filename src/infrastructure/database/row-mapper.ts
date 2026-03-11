import { Row } from "@libsql/client";

export function rowAs<T>(row: Row): T {
  return { ...row } as unknown as T;
}
