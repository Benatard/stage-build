export type ForgeId = string | number;
export type ForgeRow = Record<string, unknown>;
export type ForgeListFilter = string | number | boolean;

export type ForgeListParams = {
  limit?: number;
  offset?: number;
  order?: string;
  filters?: Record<string, ForgeListFilter | null | undefined>;
};

export type ForgeListResult<T> = {
  rows: T[];
  total?: number;
};

export type ForgeCredentials = {
  password: string;
  [key: string]: string;
};

export type ForgeSession<TUser = ForgeRow> = {
  token: string;
  user?: TUser;
};

export type ForgeGraphQLError = {
  message: string;
  [key: string]: unknown;
};

export type ForgeGraphQLResponse<T> = {
  data?: T;
  errors?: ForgeGraphQLError[];
};

export type ForgeSqlResponse<T = ForgeRow> = {
  rows?: T[];
  data?: T[];
  [key: string]: unknown;
};
