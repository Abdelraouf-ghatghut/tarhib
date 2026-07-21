export interface Pagination {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Défauts généreux (200, max 500) : bornent les listes potentiellement
 * volumineuses (employés, produits, stock...) sans changer le comportement
 * des appelants existants qui ne passent pas page/limit.
 */
export function parsePagination(
  page?: string,
  limit?: string,
  defaultLimit = 200,
  maxLimit = 500,
): Pagination {
  const parsedPage = Math.max(Number(page) || 1, 1);
  const parsedLimit = Math.min(Number(limit) || defaultLimit, maxLimit);
  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit,
  };
}
