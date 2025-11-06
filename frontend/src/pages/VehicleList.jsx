// frontend/src/pages/VehicleList.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Box, Button, Card, Stack, TextField, Typography } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import { Vehicles } from '../lib/api'

export default function VehicleList() {
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await Vehicles.list(q ? { q } : {})
      setRows((data?.rows ?? []).map(row => ({ ...row })))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const columns = useMemo(() => ([
    { field: 'license_plate', headerName: 'License Plate', flex: 0.8, minWidth: 140 },
    { field: 'brand', headerName: 'Brand', flex: 0.7, minWidth: 120 },
    { field: 'model', headerName: 'Model', flex: 0.9, minWidth: 160 },
    {
      field: 'customer',
      headerName: 'Customer',
      flex: 1.0,
      minWidth: 200,
      valueGetter: (_, row) => {
        const name = row.customer_name ?? ''
        const phone = row.customer_phone ?? ''
        return [name, phone].filter(Boolean).join(' – ')
      },
    },
    {
      field: 'created_at',
      headerName: 'Created',
      flex: 0.8,
      minWidth: 160,
    },
    {
      field: 'actions',
      headerName: '',
      flex: 0.5,
      minWidth: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Button
          component={Link}
          to={`/vehicle/${params.row.id}`}
          size="small"
          variant="outlined"
        >
          View
        </Button>
      ),
    },
  ]), [])

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight={600}>Vehicles</Typography>
        <Button component={Link} to="/vehicle/new" variant="contained">
          + New vehicle
        </Button>
      </Stack>

      <Stack direction="row" spacing={1}>
        <TextField
          placeholder="Search by license plate / customer / phone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          size="small"
          sx={{ width: 360 }}
        />
        <Button onClick={load} disabled={loading} variant="contained">
          {loading ? 'Loading…' : 'Search'}
        </Button>
      </Stack>

      <Card>
        <Box
          sx={{
            width: '100%',
            height: 'calc(100vh - 280px)',
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
            getRowId={(row) => row.id}
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
              sorting: { sortModel: [{ field: 'created_at', sort: 'desc' }] },
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
      </Card>
    </Stack>
  )
}
