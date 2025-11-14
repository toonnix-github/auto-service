import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import { Catalog, Goods, Parts, Services } from '../lib/api'

const TYPE_OPTIONS = [
  { label: 'All types', value: '' },
  { label: 'Goods', value: 'goods' },
  { label: 'Parts', value: 'part' },
  { label: 'Services', value: 'service' },
]

const GOODS_CATEGORY_OPTIONS = [
  { label: 'Oil', value: 'oil' },
  { label: 'Tire', value: 'tire' },
  { label: 'Other', value: 'other' },
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

const codeLabel = (itemType) => {
  switch (itemType) {
    case 'service':
      return 'Code'
    default:
      return 'SKU'
  }
}

const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (!normalized) return fallback
    if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true
    if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false
    return fallback
  }
  return fallback
}

const RESOURCE_MAP = {
  goods: {
    fetch: (id) => Goods.get(id),
    create: (payload) => Goods.create(payload),
    update: (id, payload) => Goods.update(id, payload),
    remove: (id) => Goods.remove(id),
  },
  part: {
    fetch: (id) => Parts.get(id),
    create: (payload) => Parts.create(payload),
    update: (id, payload) => Parts.update(id, payload),
    remove: (id) => Parts.remove(id),
  },
  service: {
    fetch: (id) => Services.get(id),
    create: (payload) => Services.create(payload),
    update: (id, payload) => Services.update(id, payload),
    remove: (id) => Services.remove(id),
  },
}

export default function CatalogPage() {
  const [rows, setRows] = useState([])
  const [type, setType] = useState('')
  const [q, setQ] = useState('')
  const [active, setActive] = useState('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [formLoading, setFormLoading] = useState(false)
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [formValues, setFormValues] = useState({
    item_type: 'goods',
    name: '',
    source_code: '',
    category: '',
    brand: '',
    model: '',
    description: '',
    taxable: true,
    active: true,
  })
  const [activeItem, setActiveItem] = useState(null)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (q) params.q = q
      if (type) params.type = type
      if (active === 'active') params.active = true
      if (active === 'inactive') params.active = false
      const data = await Catalog.list(params)
      const normalized = (data?.rows ?? []).map((row) => ({
        ...row,
        active: !!row.active,
        taxable: !!row.taxable,
      }))
      setRows(normalized)
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to load catalog')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetForm = useCallback((defaults = {}) => {
    setFormValues({
      item_type: defaults.item_type || 'goods',
      name: defaults.name || '',
      source_code: defaults.source_code || '',
      category: defaults.category || '',
      brand: defaults.brand || '',
      model: defaults.model || '',
      description: defaults.description || '',
      taxable: defaults.taxable ?? true,
      active: defaults.active ?? true,
    })
  }, [])

  const openCreateForm = useCallback(() => {
    setFormMode('create')
    setFormError('')
    setActiveItem(null)
    resetForm({ item_type: type || 'goods' })
    setFormOpen(true)
  }, [type, resetForm])

  const openEditForm = useCallback(async (row) => {
    if (!row?.item_type || !row?.source_id) return
    setFormMode('edit')
    setFormError('')
    setActiveItem({ id: row.source_id, item_type: row.item_type })
    resetForm({ item_type: row.item_type })
    setFormOpen(true)
    setFormLoading(true)

    try {
      const resource = RESOURCE_MAP[row.item_type]
      if (!resource) {
        throw new Error('Unsupported item type')
      }
      const item = await resource.fetch(row.source_id)
      if (!item) {
        throw new Error('Item not found')
      }

      resetForm({
        item_type: row.item_type,
        name: item.name || '',
        source_code: item.sku || item.code || '',
        category: item.type || '',
        brand: item.brand || '',
        model: item.model || '',
        description: item.description || '',
        taxable: normalizeBoolean(item.taxable, true),
        active: normalizeBoolean(item.active, true),
      })
    } catch (err) {
      setFormError(err.message || 'Failed to load item details')
    } finally {
      setFormLoading(false)
    }
  }, [resetForm])

  const closeForm = useCallback(() => {
    if (formSaving) return
    setFormOpen(false)
    setFormLoading(false)
    setFormError('')
    setActiveItem(null)
    resetForm({ item_type: type || 'goods' })
  }, [formSaving, resetForm, type])

  const mapFormToPayload = (itemType, values) => {
    const name = values.name.trim()
    const category = values.category.trim()
    const sourceCode = values.source_code.trim()
    const description = values.description.trim()
    const brand = values.brand.trim()
    const model = values.model.trim()

    const base = {
      name,
      description: description || null,
      brand: brand || null,
      model: model || null,
      taxable: values.taxable,
      active: values.active,
    }

    if (itemType === 'goods' || itemType === 'part') {
      return {
        ...base,
        sku: sourceCode || null,
        type: category,
      }
    }

    if (itemType === 'service') {
      return {
        ...base,
        code: sourceCode || null,
        type: category,
      }
    }

    throw new Error('Unsupported item type')
  }

  const handleSave = async () => {
    if (formLoading || formSaving) return

    const itemType = formValues.item_type
    const resource = RESOURCE_MAP[itemType]
    if (!resource) {
      setFormError('Unsupported item type')
      return
    }

    const name = formValues.name.trim()
    if (!name) {
      setFormError('Name is required')
      return
    }

    const category = formValues.category.trim()
    if (!category) {
      setFormError('Category is required')
      return
    }

    let normalizedCategory = category
    if (itemType === 'goods') {
      normalizedCategory = category.toLowerCase()
      const allowed = GOODS_CATEGORY_OPTIONS.map((option) => option.value)
      if (!allowed.includes(normalizedCategory)) {
        setFormError('Goods category must be one of: Oil, Tire, Other')
        return
      }
    }

    setFormSaving(true)
    setFormError('')

    try {
      const payload = mapFormToPayload(itemType, {
        ...formValues,
        category: normalizedCategory,
      })

      if (formMode === 'edit') {
        if (!activeItem?.id) {
          throw new Error('Item is missing identifier')
        }
        await resource.update(activeItem.id, payload)
      } else {
        await resource.create(payload)
      }

      setFormOpen(false)
      setFormLoading(false)
      setFormError('')
      setActiveItem(null)
      resetForm({ item_type: type || 'goods' })
      await load()
    } catch (err) {
      setFormError(err.message || 'Failed to save item')
    } finally {
      setFormSaving(false)
    }
  }

  const handleDeleteClick = useCallback((row) => {
    setDeleteTarget(row)
    setDeleteError('')
  }, [])

  const handleDeleteClose = useCallback(() => {
    if (deleteLoading) return
    setDeleteTarget(null)
    setDeleteError('')
  }, [deleteLoading])

  const handleDeleteConfirm = async () => {
    if (!deleteTarget?.item_type || !deleteTarget?.source_id) return

    const resource = RESOURCE_MAP[deleteTarget.item_type]
    if (!resource) {
      setDeleteError('Unsupported item type')
      return
    }

    setDeleteLoading(true)
    setDeleteError('')

    try {
      await resource.remove(deleteTarget.source_id)
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete item')
    } finally {
      setDeleteLoading(false)
    }
  }

  const columns = useMemo(() => ([
    {
      field: 'name',
      headerName: 'Name',
      flex: 1.4,
      minWidth: 220,
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
      valueGetter: (params) => params || '—',
    },
    {
      field: 'source_code',
      headerName: 'Code / SKU',
      flex: 0.7,
      minWidth: 160,
      valueGetter: (params) => params || '—',
    },
    {
      field: 'category',
      headerName: 'Category',
      flex: 0.7,
      minWidth: 150,
      valueGetter: (params) => params || '—',
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1.5,
      minWidth: 260,
      valueGetter: (params) => params || '—',
    },
    {
      field: 'active',
      headerName: 'Status',
      flex: 0.6,
      minWidth: 140,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'Active' : 'Inactive'}
          size="small"
          color={params.value ? 'success' : 'default'}
          sx={{ fontWeight: 500 }}
        />
      ),
    },
    {
      field: 'actions',
      headerName: '',
      flex: 0.8,
      minWidth: 180,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" onClick={() => openEditForm(params.row)}>
            Edit
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => handleDeleteClick(params.row)}
          >
            Delete
          </Button>
        </Stack>
      ),
    },
  ]), [handleDeleteClick, openEditForm])

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight={600}>
          Catalog
        </Typography>
        <Button variant="contained" onClick={openCreateForm}>
          + Add item
        </Button>
      </Stack>

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

          {error ? <Alert severity="error">{error}</Alert> : null}

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

      <Dialog open={formOpen} onClose={closeForm} fullWidth maxWidth="sm">
        <DialogTitle>{formMode === 'edit' ? 'Edit catalog item' : 'Add catalog item'}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError ? <Alert severity="error">{formError}</Alert> : null}
            {formMode === 'edit' && formLoading ? (
              <Typography variant="body2" color="text.secondary">
                Loading item details…
              </Typography>
            ) : null}
            <TextField
              select
              label="Item type"
              value={formValues.item_type}
              onChange={(event) =>
                setFormValues((prev) => ({ ...prev, item_type: event.target.value }))
              }
              disabled={formMode === 'edit' || formLoading || formSaving}
            >
              {TYPE_OPTIONS.filter((option) => option.value).map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Name"
              value={formValues.name}
              onChange={(event) =>
                setFormValues((prev) => ({ ...prev, name: event.target.value }))
              }
              disabled={formLoading || formSaving}
              required
            />

            <TextField
              label={codeLabel(formValues.item_type)}
              value={formValues.source_code}
              onChange={(event) =>
                setFormValues((prev) => ({ ...prev, source_code: event.target.value }))
              }
              disabled={formLoading || formSaving}
            />

            {formValues.item_type === 'goods' ? (
              <TextField
                select
                label="Category"
                value={formValues.category}
                onChange={(event) =>
                  setFormValues((prev) => ({ ...prev, category: event.target.value }))
                }
                disabled={formLoading || formSaving}
                required
              >
                {GOODS_CATEGORY_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <TextField
                label="Category"
                value={formValues.category}
                onChange={(event) =>
                  setFormValues((prev) => ({ ...prev, category: event.target.value }))
                }
                disabled={formLoading || formSaving}
                required
              />
            )}

            <TextField
              label="Brand"
              value={formValues.brand}
              onChange={(event) =>
                setFormValues((prev) => ({ ...prev, brand: event.target.value }))
              }
              disabled={formLoading || formSaving}
            />

            <TextField
              label="Model"
              value={formValues.model}
              onChange={(event) =>
                setFormValues((prev) => ({ ...prev, model: event.target.value }))
              }
              disabled={formLoading || formSaving}
            />

            <TextField
              label="Description"
              value={formValues.description}
              onChange={(event) =>
                setFormValues((prev) => ({ ...prev, description: event.target.value }))
              }
              disabled={formLoading || formSaving}
              multiline
              minRows={3}
            />

            <Stack direction="row" spacing={2}>
              <FormControlLabel
                control={(
                  <Switch
                    checked={formValues.taxable}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, taxable: event.target.checked }))
                    }
                    disabled={formLoading || formSaving}
                  />
                )}
                label="Taxable"
              />
              <FormControlLabel
                control={(
                  <Switch
                    checked={formValues.active}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, active: event.target.checked }))
                    }
                    disabled={formLoading || formSaving}
                  />
                )}
                label="Active"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeForm} disabled={formSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={formSaving || formLoading}>
            {formSaving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteTarget} onClose={handleDeleteClose} maxWidth="xs" fullWidth>
        <DialogTitle>Delete catalog item</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {deleteError ? <Alert severity="error">{deleteError}</Alert> : null}
            <Typography>
              Are you sure you want to delete
              {' '}
              <strong>{deleteTarget?.name}</strong>
              ?
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteLoading}
          >
            {deleteLoading ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
