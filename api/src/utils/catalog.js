export const composeCatalogName = (category, brand, model) => {
  const parts = [category, brand, model]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)

  return parts.join(' ')
}

export const composeCatalogNameFromRow = (row) =>
  composeCatalogName(row?.category ?? row?.type, row?.brand, row?.model)
