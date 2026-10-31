export function getPagination(query, defaultPageSize = 20, maxPageSize = 100) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const requestedSize = parseInt(query.pageSize, 10) || defaultPageSize;
  const pageSize = Math.max(1, Math.min(requestedSize, maxPageSize));
  const skip = (page - 1) * pageSize;

  return { page, pageSize, skip, limit: pageSize };
}

export function formatPaginationMeta(page, pageSize, total) {
  return {
    page,
    pageSize,
    total,
  };
}

