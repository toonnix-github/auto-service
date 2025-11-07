import React, { useEffect, useMemo, useState } from 'react'
import { Box, Button, Card, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import { Catalog } from '../lib/api'

const TYPE_OPTIONS = [
  { label: 'All types', value: '' },
  { label: 'Goods', value: 'goods' },
  { label: 'Parts', value: 'part' },
  { label: 'Services', value: 'service' },
]

const typeChipColor = (type) => {
  switch (type) {
    case 'goods':
      return 'primary'
    case 'part':
      return 'info'
    case 'service':
      return 'success'
    default:
      return 'default'
  }
}

const formatCurrency = (value) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '-'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value))
}

export default function CatalogPage() {
  const [rows, setRows] = useState([])
  const [type, setType] = useState('')
  const [q, setQ] = useState('')
  const [active, setActive] = useState('all')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (q) params.q = q
      if (type) params.type = type
      if (active === 'active') params.active = true
      if (active === 'inactive') params.active = false
      const data = await Catalog.list(params)
      setRows(data?.rows ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const columns = useMemo(() => ([
    {
      field: 'name',
      headerName: 'Name',
      flex: 1.4,
      minWidth: 220,
      valueGetter: (params) => params.row.name,
    },
    {
      field: 'item_type',
      headerName: 'Type',
      flex: 0.7,
      minWidth: 120,
      renderCell: (params) => (
        <Chip
          label={params.value?.charAt(0)?.toUpperCase() + params.value?.slice(1) || 'Unknown'}
          size="small"
          color={typeChipColor(params.value)}
          sx={{ fontWeight: 500 }}
        />
      ),
    },
    {
      field: 'brand',
      headerName: 'Brand',
      flex: 0.8,
      minWidth: 150,
      valueGetter: (params) => params.row.brand || '—',
    },
    {
      field: 'source_code',
      headerName: 'Code / SKU',
      flex: 0.7,
      minWidth: 160,
      valueGetter: (params) => params.row.source_code || '—',
    },
    {
      field: 'price',
      headerName: 'Price',
      flex: 0.6,
      minWidth: 140,
      valueFormatter: (params) => formatCurrency(params.value),
    },
    {
      field: 'category',
      headerName: 'Category',
      flex: 0.7,
      minWidth: 150,
      valueGetter: (params) => params.row.category || '—',
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1.5,
      minWidth: 260,
      valueGetter: (params) => params.row.description || '—',
    },
  ]), [])

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={600}>
        Catalog
      </Typography>

      <Card>
        <Stack spacing={2} sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
            <TextField
              label="Search"
              placeholder="Search by name, brand, description, or code"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  load()
                }
              }}
              size="small"
              sx={{ width: { xs: '100%', sm: 320 } }}
            />
            <TextField
              select
              label="Type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              size="small"
              sx={{ width: { xs: '100%', sm: 180 } }}
            >
              {TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value || 'all'} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Active"
              value={active}
              onChange={(event) => setActive(event.target.value)}
              size="small"
              sx={{ width: { xs: '100%', sm: 180 } }}
            >
              <MenuItem value="all">All statuses</MenuItem>
              <MenuItem value="active">Active only</MenuItem>
              <MenuItem value="inactive">Inactive only</MenuItem>
            </TextField>
            <Button
              variant="contained"
              onClick={load}
              disabled={loading}
              sx={{
                width: { xs: '100%', sm: 150 },
                fontWeight: 600,
              }}
            >
              {loading ? 'Loading…' : 'Apply filters'}
            </Button>
          </Stack>

          <Box
            sx={{
              width: '100%',
              height: 'calc(100vh - 320px)',
              display: 'flex',
              flexDirection: 'column',
              '& .MuiDataGrid-root': { flex: 1, minWidth: 0 },
              '& .MuiDataGrid-main': { flex: 1, overflow: 'hidden' },
              '& .MuiDataGrid-virtualScroller': { overflowY: 'auto', overflowX: 'auto' },
              '& .MuiDataGrid-virtualScrollerContent': { minWidth: '100%' },
              '& .MuiDataGrid-columnHeaders': { backgroundColor: '#f2f6ff' },
            }}
          >
            <DataGrid
              rows={rows}
              columns={columns}
              loading={loading}
              disableRowSelectionOnClick
              density="standard"
              getRowId={(row) => row.item_id}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10, page: 0 } },
                sorting: { sortModel: [{ field: 'name', sort: 'asc' }] },
              }}
              sx={{
                borderRadius: 2,
                flex: 1,
                '& .MuiDataGrid-cell': {
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                },
              }}
            />
          </Box>
        </Stack>
      </Card>
    </Stack>
  )
}
