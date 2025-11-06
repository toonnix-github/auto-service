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
import { Customers } from '../lib/api'

const emptyForm = {
  name: '',
  phone: '',
  email: '',
}

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const [form, setForm] = useState(emptyForm)
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const load = async () => {
      if (isNew) return
      setLoading(true)
      setError('')
      try {
        const data = await Customers.get(id)
        const c = data?.customer
        if (c && active) {
          setCustomer(c)
          setForm({
            name: c.name ?? '',
            phone: c.phone ?? '',
            email: c.email ?? '',
          })
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Failed to load customer')
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
    if (!form.name.trim()) {
      setError('Name is required')
      return false
    }
    if (!form.phone.trim()) {
      setError('Phone is required')
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
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
    }

    try {
      if (isNew) {
        const result = await Customers.create(payload)
        const created = result?.customer
        if (created) {
          setMessage('Customer created successfully')
          navigate(`/customer/${created.id}`)
        } else {
          setMessage('Customer created')
          navigate('/customer')
        }
      } else {
        const result = await Customers.update(id, payload)
        const updated = result?.customer
        setMessage('Changes saved')
        if (updated) {
          setCustomer(updated)
          setForm({
            name: updated.name ?? '',
            phone: updated.phone ?? '',
            email: updated.email ?? '',
          })
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to save customer')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!customer || !window.confirm('Delete this customer?')) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await Customers.remove(customer.id)
      navigate('/customer')
    } catch (err) {
      setError(err.message || 'Failed to delete customer')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight={600}>
          {isNew ? 'New customer' : customer ? customer.name : 'Customer'}
        </Typography>
        <Button component={Link} to="/customer" variant="outlined">
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
              label="Name"
              value={form.name}
              onChange={handleChange('name')}
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Phone"
              value={form.phone}
              onChange={handleChange('phone')}
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Email"
              value={form.email}
              onChange={handleChange('email')}
              InputLabelProps={{ shrink: true }}
            />

            {!isNew && customer?.created_at ? (
              <Typography variant="body2" color="text.secondary">
                Created at: {customer.created_at}
              </Typography>
            ) : null}

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
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
