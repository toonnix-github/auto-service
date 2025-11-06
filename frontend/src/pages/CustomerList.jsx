import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Box, Button, Card, Stack, TextField, Typography } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import { Customers } from '../lib/api'

export default function CustomerList() {
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await Customers.list(q ? { q } : {})
      setRows((data?.rows ?? []).map(row => ({ ...row })))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const columns = useMemo(() => ([
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 180 },
    { field: 'phone', headerName: 'Phone', flex: 0.8, minWidth: 160 },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
    { field: 'created_at', headerName: 'Created', flex: 0.7, minWidth: 160 },
    {
      field: 'actions',
      headerName: '',
      flex: 0.4,
      minWidth: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Button
          component={Link}
          to={`/customer/${params.row.id}`}
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
        <Typography variant="h5" fontWeight={600}>Customers</Typography>
        <Button component={Link} to="/customer/new" variant="contained">
          + New customer
        </Button>
      </Stack>

      <Stack direction="row" spacing={1}>
        <TextField
          placeholder="Search by name / phone / email"
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
