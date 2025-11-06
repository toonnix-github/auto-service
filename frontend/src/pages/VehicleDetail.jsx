// frontend/src/pages/VehicleDetail.jsx
import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Vehicles } from '../lib/api'

const emptyForm = {
  customerId: '',
  brand: '',
  model: '',
  licensePlate: '',
}

export default function VehicleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const isNew = id === 'new'

  const [form, setForm] = useState(emptyForm)
  const [vehicle, setVehicle] = useState(null)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(isNew)

  useEffect(() => {
    setIsEditing(isNew)
  }, [isNew])

  useEffect(() => {
    let active = true

    const load = async () => {
      if (isNew) return
      setLoading(true)
      setError('')
      try {
        const data = await Vehicles.get(id)
        const v = data?.vehicle
        if (v && active) {
          setVehicle(v)
          setForm({
            customerId: v.customer_id ?? '',
            brand: v.brand ?? '',
            model: v.model ?? '',
            licensePlate: v.license_plate ?? '',
          })
          setIsEditing(false)
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Failed to load vehicle')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => { active = false }
  }, [id, isNew])

  const handleChange = (field) => (event) => {
    const value = event.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const validate = () => {
    if (!form.customerId.trim()) {
      setError('Customer ID is required')
      return false
    }
    if (!form.licensePlate.trim()) {
      setError('License plate is required')
      return false
    }
    return true
  }

  const handleSave = async () => {
    if (!validate()) return

    setSaving(true)
    setError('')
    setMessage('')

    const payload = {
      customerId: form.customerId.trim(),
      brand: form.brand.trim() || null,
      model: form.model.trim() || null,
      licensePlate: form.licensePlate.trim(),
    }

    try {
      if (isNew) {
        const result = await Vehicles.create(payload)
        const created = result?.vehicle
        if (created) {
          setMessage('Vehicle created successfully')
          navigate(`/vehicle/${created.id}`)
        } else {
          setMessage('Vehicle created')
          navigate('/vehicle')
        }
      } else {
        const result = await Vehicles.update(id, payload)
        const updated = result?.vehicle
        setMessage('Changes saved')
        if (updated) {
          setVehicle(updated)
          setForm({
            customerId: updated.customer_id ?? '',
            brand: updated.brand ?? '',
            model: updated.model ?? '',
            licensePlate: updated.license_plate ?? '',
          })
        }
        setIsEditing(false)
      }
    } catch (err) {
      setError(err.message || 'Failed to save vehicle')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    setMessage('')
  }

  const handleCancel = () => {
    if (!isNew && vehicle) {
      setForm({
        customerId: vehicle.customer_id ?? '',
        brand: vehicle.brand ?? '',
        model: vehicle.model ?? '',
        licensePlate: vehicle.license_plate ?? '',
      })
    } else {
      setForm(emptyForm)
    }
    setIsEditing(isNew)
    setMessage('')
    setError('')
  }

  const handleDelete = async () => {
    if (!vehicle || !window.confirm('Delete this vehicle?')) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await Vehicles.remove(vehicle.id)
      navigate('/vehicle')
    } catch (err) {
      setError(err.message || 'Failed to delete vehicle')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight={600}>
          {isNew ? 'New vehicle' : vehicle ? `Vehicle ${vehicle.license_plate}` : 'Vehicle'}
        </Typography>
        <Button component={Link} to="/vehicle" variant="outlined">
          ← Back to list
        </Button>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {message ? <Alert severity="success">{message}</Alert> : null}

      <Card sx={{ p: 3, maxWidth: 560 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Stack spacing={2}>
            <TextField
              label="Customer ID"
              value={form.customerId}
              onChange={handleChange('customerId')}
              required
              InputLabelProps={{ shrink: true }}
              disabled={!isEditing}
            />
            <TextField
              label="Brand"
              value={form.brand}
              onChange={handleChange('brand')}
              InputLabelProps={{ shrink: true }}
              disabled={!isEditing}
            />
            <TextField
              label="Model"
              value={form.model}
              onChange={handleChange('model')}
              InputLabelProps={{ shrink: true }}
              disabled={!isEditing}
            />
            <TextField
              label="License Plate"
              value={form.licensePlate}
              onChange={handleChange('licensePlate')}
              required
              InputLabelProps={{ shrink: true }}
              disabled={!isEditing}
            />

            {!isNew && vehicle?.created_at ? (
              <Typography variant="body2" color="text.secondary">
                Created at: {vehicle.created_at}
              </Typography>
            ) : null}

            <Stack direction="row" spacing={2}>
              {isEditing ? (
                <>
                  <Button
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button variant="contained" onClick={handleEdit}>
                  Edit
                </Button>
              )}
              {!isNew && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  Delete
                </Button>
              )}
            </Stack>
          </Stack>
        )}
      </Card>
    </Stack>
  )
}
