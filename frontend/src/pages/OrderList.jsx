// frontend/src/pages/OrdersList.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Box, Card, Stack, TextField, Button, Typography } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import { Orders } from '../lib/api'
import { OrderStatusMenu } from '../components/OrderStatusMenu.jsx'
import OrderDetailDialog from '../components/OrderDetailDialog.jsx'

export default function OrdersList() {
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusUpdatingId, setStatusUpdatingId] = useState(null)
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const load = async () => {
    setLoading(true)
    try {
      const data = await Orders.list(q ? { q } : {})
      setRows((data.rows || []).map(r => ({ ...r })))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleStatusChange = useCallback(async (orderId, status) => {
    setStatusUpdatingId(orderId)
    try {
      await Orders.updateStatus(orderId, status)
      setRows((prev) =>
        prev.map((row) =>
          row.id === orderId
            ? { ...row, status }
            : row,
        ),
      )
    } catch (error) {
      window.alert(error.message || 'Failed to update status')
    } finally {
      setStatusUpdatingId(null)
    }
  }, [])

  const columns = useMemo(() => ([
    // Date
    { field: 'date', headerName: 'Date', flex: 0.6, minWidth: 110 },

    // Customer
    { field: 'customer_name', headerName: 'Customer', flex: 1.0, minWidth: 160 },

    // Car (Brand – Model – Plate)
    {
      field: 'vehicle',
      headerName: 'Car (Brand – Model – Plate)',
      flex: 1.4,
      minWidth: 240,
      valueGetter: (_, r) => {
        const brandModel = `${r.brand ?? ''} ${r.model ?? ''}`.trim()
        return [brandModel, r.license_plate].filter(Boolean).join(' – ')
      }
    },

    // Status
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.7,
      minWidth: 150,
      renderCell: (params) => (
        <OrderStatusMenu
          status={params.row.status}
          size="small"
          loading={statusUpdatingId === params.row.id}
          disabled={statusUpdatingId !== null && statusUpdatingId !== params.row.id}
          onChange={(newStatus) => handleStatusChange(params.row.id, newStatus)}
        />
      ),
      sortable: false,
    },

    // Price (Total)
    {
      field: 'total',
      headerName: 'Price',
      flex: 0.6,
      minWidth: 120,
      align: 'right',
      headerAlign: 'right',
      renderCell: (p) => {
        const v = Number(p.row.total)
        return Number.isFinite(v)
          ? v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : '-'
      },
    },

    // Action (View)
    {
      field: 'action',
      headerName: '',
      flex: 0.4,
      minWidth: 100,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Button
          size="small"
          variant="outlined"
          onClick={() => setSelectedOrderId(params.row.id)}
        >
          View
        </Button>
      ),
    },
  ]), [handleStatusChange, statusUpdatingId])

  const handleDialogClose = useCallback(() => {
    setSelectedOrderId(null)
  }, [])

  const handleDialogStatusChange = useCallback((orderId, status) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === orderId
          ? { ...row, status }
          : row,
      ),
    )
  }, [])

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight={600}>Orders</Typography>
        <Stack direction="row" spacing={1}>
          <Button component={Link} to="/order/new" variant="contained">
            + New order
          </Button>
          <Button component={Link} to="/vehicle" variant="outlined">
            View vehicles
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1}>
        <TextField
          placeholder="Search by order no / customer / phone / plate"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          size="small"
          sx={{ width: 420 }}
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
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
              sorting: { sortModel: [{ field: 'date', sort: 'desc' }] },
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

      <OrderDetailDialog
        orderId={selectedOrderId}
        open={selectedOrderId !== null}
        onClose={handleDialogClose}
        onStatusChange={handleDialogStatusChange}
      />
    </Stack>
  )
}
