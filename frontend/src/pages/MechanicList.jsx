import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import { Mechanics } from '../lib/api'

export default function MechanicList() {
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [formName, setFormName] = useState('')
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [activeMechanic, setActiveMechanic] = useState(null)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await Mechanics.list(q ? { q } : {})
      setRows((data?.rows ?? []).map((row) => ({ ...row })))
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to load mechanics')
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => {
    load()
  }, [load])

  const handleSearch = useCallback(() => {
    load()
  }, [load])

  const handleOpenCreate = useCallback(() => {
    setFormMode('create')
    setFormName('')
    setFormError('')
    setActiveMechanic(null)
    setFormOpen(true)
  }, [])

  const handleEditClick = useCallback((row) => {
    setFormMode('edit')
    setFormName(row?.name || '')
    setFormError('')
    setActiveMechanic(row)
    setFormOpen(true)
  }, [])

  const handleDeleteClick = useCallback((row) => {
    setDeleteTarget(row)
    setDeleteError('')
  }, [])

  const handleFormClose = useCallback(() => {
    if (formLoading) return
    setFormOpen(false)
    setActiveMechanic(null)
    setFormName('')
    setFormError('')
  }, [formLoading])

  const handleSave = useCallback(async () => {
    const name = formName.trim()
    if (!name) {
      setFormError('Name is required')
      return
    }

    setFormLoading(true)
    setFormError('')

    try {
      if (formMode === 'edit' && activeMechanic) {
        await Mechanics.update(activeMechanic.id, { name })
      } else {
        await Mechanics.create({ name })
      }

      setFormOpen(false)
      setActiveMechanic(null)
      setFormName('')
      await load()
    } catch (err) {
      setFormError(err.message || 'Failed to save mechanic')
    } finally {
      setFormLoading(false)
    }
  }, [formName, formMode, activeMechanic, load])

  const handleDeleteClose = useCallback(() => {
    if (deleteLoading) return
    setDeleteTarget(null)
    setDeleteError('')
  }, [deleteLoading])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return

    setDeleteLoading(true)
    setDeleteError('')

    try {
      await Mechanics.remove(deleteTarget.id)
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete mechanic')
    } finally {
      setDeleteLoading(false)
    }
  }, [deleteTarget, load])

  const columns = useMemo(
    () => [
      { field: 'name', headerName: 'Name', flex: 1, minWidth: 200 },
      { field: 'created_at', headerName: 'Created', flex: 0.7, minWidth: 180 },
      {
        field: 'actions',
        headerName: '',
        flex: 0.5,
        minWidth: 160,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" onClick={() => handleEditClick(params.row)}>
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
    ],
    [handleEditClick, handleDeleteClick],
  )

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight={600}>
          Mechanics
        </Typography>
        <Button variant="contained" onClick={handleOpenCreate}>
          + Add mechanic
        </Button>
      </Stack>

      <Stack direction="row" spacing={1}>
        <TextField
          placeholder="Search by name"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleSearch()
            }
          }}
          size="small"
          sx={{ width: 320 }}
        />
        <Button onClick={handleSearch} disabled={loading} variant="contained">
          {loading ? 'Loading…' : 'Search'}
        </Button>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

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
      </Card>

      <Dialog open={formOpen} onClose={handleFormClose} fullWidth maxWidth="xs">
        <DialogTitle>{formMode === 'edit' ? 'Edit mechanic' : 'Add mechanic'}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {formError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          ) : null}
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            value={formName}
            onChange={(event) => setFormName(event.target.value)}
            disabled={formLoading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleFormClose} disabled={formLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={formLoading} variant="contained">
            {formLoading ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={handleDeleteClose} fullWidth maxWidth="xs">
        <DialogTitle>Delete mechanic</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {deleteError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          ) : null}
          <Typography>
            Are you sure you want to delete{' '}
            <Typography component="span" fontWeight={600}>
              {deleteTarget?.name}
            </Typography>
            ?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" disabled={deleteLoading} variant="contained">
            {deleteLoading ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
