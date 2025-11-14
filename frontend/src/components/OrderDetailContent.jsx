import React, { useCallback, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { Box, Card, Stack, Typography, Chip, Grid, CircularProgress } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import { Orders } from '../lib/api'
import { OrderStatusMenu } from './OrderStatusMenu.jsx'
import { currencyFormatter, quantityFormatter, normalizeOrderItems } from '../pages/orderDetailUtils.js'

const shouldDisableVirtualization = Boolean(globalThis?.__DISABLE_DATA_GRID_VIRTUALIZATION__)

export default function OrderDetailContent({ orderId, headerActions = null, onStatusChange, sx }) {
  const [data, setData] = useState(null)
  const [statusSaving, setStatusSaving] = useState(false)

  const loading = !data

  const columns = useMemo(() => ([
    { field: 'no', headerName: '#', flex: 0.35, minWidth: 60 },
    {
      field: 'type',
      headerName: 'Type',
      flex: 0.6,
      minWidth: 90,
      renderCell: (p) => <Chip size="small" label={p.value} variant="outlined" />,
    },
    { field: 'name_snapshot', headerName: 'Name', flex: 1.4, minWidth: 220 },
    {
      field: 'qty',
      headerName: 'Qty',
      flex: 0.5,
      minWidth: 80,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => quantityFormatter(value),
    },
    {
      field: 'unit_price',
      headerName: 'Price',
      flex: 0.6,
      minWidth: 110,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => currencyFormatter(value),
    },
    {
      field: 'line_total',
      headerName: 'Amount',
      flex: 0.7,
      minWidth: 120,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => currencyFormatter(value),
    },
  ]), [])

  useEffect(() => {
    let active = true

    if (!orderId) {
      setData(null)
      return () => { active = false }
    }

    setData(null)
    setStatusSaving(false)

    const fetchOrder = async () => {
      try {
        const result = await Orders.get(orderId)
        if (active) {
          setData(result)
        }
      } catch (error) {
        if (active) {
          console.error('Failed to load order detail', error)
          window.alert(error.message || 'Failed to load order detail')
        }
      }
    }

    fetchOrder()

    return () => {
      active = false
    }
  }, [orderId])

  const handleStatusChange = useCallback(async (newStatus) => {
    if (!orderId) return

    setStatusSaving(true)
    try {
      await Orders.updateStatus(orderId, newStatus)
      setData((prev) => (prev ? { ...prev, order: { ...prev.order, status: newStatus } } : prev))
      if (onStatusChange) {
        onStatusChange(orderId, newStatus)
      }
    } catch (error) {
      window.alert(error.message || 'Failed to update status')
    } finally {
      setStatusSaving(false)
    }
  }, [orderId, onStatusChange])

  const order = data?.order
  const items = useMemo(() => normalizeOrderItems(data?.items ?? []), [data])
  const mechanics = data?.mechanics ?? []
  const odometerValue = order?.odometer
  const formattedOdometer = odometerValue === null || odometerValue === undefined
    ? null
    : (() => {
        const num = Number(odometerValue)
        return Number.isFinite(num) ? num.toLocaleString() : String(odometerValue)
      })()

  return (
    <Stack spacing={2} sx={sx}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight={600}>
          {order ? `Order ${order.order_no}` : 'Order'}
        </Typography>
        {headerActions}
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2, minHeight: 96 }}>
            <Typography variant="subtitle2" color="text.secondary">Customer</Typography>
            {loading ? <SkeletonLine /> : (
              <>
                <Typography fontWeight={600}>{order.customer_name}</Typography>
                <Typography variant="body2">{order.phone}</Typography>
              </>
            )}
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2, minHeight: 96 }}>
            <Typography variant="subtitle2" color="text.secondary">Vehicle</Typography>
            {loading ? <SkeletonLine /> : (
              <>
                <Typography>{order.brand} {order.model}</Typography>
                <Typography variant="body2">{order.license_plate}</Typography>
                {formattedOdometer ? (
                  <Typography variant="body2">Odometer: {formattedOdometer}</Typography>
                ) : null}
              </>
            )}
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2, minHeight: 96 }}>
            <Typography variant="subtitle2" color="text.secondary">Status</Typography>
            {loading ? <SkeletonLine /> : (
              <>
                <OrderStatusMenu
                  status={order.status}
                  size="small"
                  fullWidth
                  loading={statusSaving}
                  disabled={statusSaving}
                  onChange={handleStatusChange}
                />
                <Typography variant="body2" sx={{ mt: 1 }}>Date: {order.date}</Typography>
              </>
            )}
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card sx={{ p: 2, minHeight: 96 }}>
            <Typography variant="subtitle2" color="text.secondary">Mechanics</Typography>
            {loading ? <SkeletonLine width="40%" /> : (
              mechanics.length ? (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                  {mechanics.map((mechanic) => (
                    <Chip key={mechanic.id} label={mechanic.name} size="small" variant="outlined" />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ mt: 1 }}>—</Typography>
              )
            )}
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Items</Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Box
            sx={{
              width: '100%',
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
              rows={items}
              getRowId={(r) => r.id}
              columns={columns}
              hideFooterSelectedRowCount
              disableRowSelectionOnClick
              density="compact"
              pageSizeOptions={[10]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10, page: 0 } },
              }}
              disableVirtualization={shouldDisableVirtualization}
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
        )}

        <Stack direction="row" spacing={4} justifyContent="flex-end" sx={{ mt: 2 }}>
          <TotalBlock label="Subtotal" value={order?.subtotal} loading={loading} />
          <TotalBlock label="VAT" value={order?.vat} loading={loading} />
          <TotalBlock label="Total" value={order?.total} loading={loading} strong />
        </Stack>
      </Card>
    </Stack>
  )
}

OrderDetailContent.propTypes = {
  orderId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  headerActions: PropTypes.node,
  onStatusChange: PropTypes.func,
  sx: PropTypes.object,
}

OrderDetailContent.defaultProps = {
  orderId: undefined,
  headerActions: null,
  onStatusChange: undefined,
  sx: undefined,
}

function TotalBlock({ label, value, strong, loading }) {
  const content = loading
    ? <SkeletonLine width={80} />
    : currencyFormatter(value)
  return (
    <Stack alignItems="flex-end">
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant={strong ? 'h6' : 'body1'} fontWeight={strong ? 700 : 600}>
        {content}
      </Typography>
    </Stack>
  )
}

TotalBlock.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  strong: PropTypes.bool,
  loading: PropTypes.bool,
}

TotalBlock.defaultProps = {
  value: null,
  strong: false,
  loading: false,
}

function SkeletonLine({ width = '60%' }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
      <Box sx={{ width, height: 10, bgcolor: 'action.hover', borderRadius: 1 }} />
    </Box>
  )
}

SkeletonLine.propTypes = {
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
}

SkeletonLine.defaultProps = {
  width: '60%',
}
