import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import {
  Customers,
  Goods,
  Orders,
  Parts,
  Services,
  Vehicles,
} from '../lib/api'

const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'transfer', label: 'Bank transfer' },
  { value: 'ewallet', label: 'E-Wallet' },
]

const VAT_RATE = 0.07

export default function OrderNew() {
  const navigate = useNavigate()

  const [customer, setCustomer] = useState(null)
  const [vehicle, setVehicle] = useState(null)
  const [items, setItems] = useState([])
  const [form, setForm] = useState({
    paymentMethod: 'cash',
    credit: false,
    notes: '',
    techNote: '',
    odometer: '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [customerSelectOpen, setCustomerSelectOpen] = useState(false)
  const [customerCreateOpen, setCustomerCreateOpen] = useState(false)
  const [vehicleSelectOpen, setVehicleSelectOpen] = useState(false)
  const [vehicleCreateOpen, setVehicleCreateOpen] = useState(false)
  const [itemDialogOpen, setItemDialogOpen] = useState(false)

  const totals = useMemo(() => {
    const subtotal = items.reduce((acc, item) => acc + item.qty * item.unitPrice, 0)
    const vat = subtotal * VAT_RATE
    const total = subtotal + vat
    return {
      subtotal: Number(subtotal.toFixed(2)),
      vat: Number(vat.toFixed(2)),
      total: Number(total.toFixed(2)),
    }
  }, [items])

  const canSave = customer && vehicle && items.length > 0 && !saving

  const handleAddItem = (item) => {
    setItems((prev) => [...prev, item])
    setItemDialogOpen(false)
  }

  const handleDeleteItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError('')

    try {
      const payload = {
        order: {
          customerId: customer.id,
          vehicleId: vehicle.id,
          odometer: form.odometer ? Number(form.odometer) : null,
          paymentMethod: form.paymentMethod || null,
          credit: form.credit,
          notes: form.notes || null,
          techNote: form.techNote || null,
          vatRate: VAT_RATE,
        },
        items: items.map((item) => ({
          sourceId: item.sourceId,
          type: item.type,
          qty: item.qty,
          unitPrice: item.unitPrice,
          nameSnapshot: item.name,
        })),
      }

      const result = await Orders.create(payload)
      const orderId = result?.order?.id
      if (orderId) {
        navigate(`/order/${orderId}`)
      } else {
        navigate('/order')
      }
    } catch (err) {
      setError(err.message || 'Failed to save order')
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (value) =>
    Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight={600}>
          New order
        </Typography>
        <Button component={Link} to="/order" variant="outlined">
          ← Back to list
        </Button>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={2}>
              <SectionHeader
                title="Customer"
                actions={
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" onClick={() => setCustomerSelectOpen(true)}>
                      Select
                    </Button>
                    <Button variant="contained" onClick={() => setCustomerCreateOpen(true)}>
                      + New customer
                    </Button>
                  </Stack>
                }
              />

              {customer ? (
                <Stack spacing={0.5}>
                  <Typography fontWeight={600}>{customer.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {customer.phone}
                  </Typography>
                  {customer.email ? (
                    <Typography variant="body2" color="text.secondary">
                      {customer.email}
                    </Typography>
                  ) : null}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Select or create a customer to start an order.
                </Typography>
              )}
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={2}>
              <SectionHeader
                title="Vehicle"
                actions={
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      onClick={() => setVehicleSelectOpen(true)}
                      disabled={!customer}
                    >
                      Select vehicle
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => setVehicleCreateOpen(true)}
                      disabled={!customer}
                    >
                      + New vehicle
                    </Button>
                  </Stack>
                }
              />

              {customer && !vehicle ? (
                <Typography variant="body2" color="text.secondary">
                  Choose one of {customer.name.split(' ')[0] ?? 'this customer'}'s vehicles or create a new one.
                </Typography>
              ) : null}

              {vehicle ? (
                <Stack spacing={0.5}>
                  <Typography fontWeight={600}>
                    {[vehicle.brand, vehicle.model].filter(Boolean).join(' ')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Plate: {vehicle.license_plate}
                  </Typography>
                  <TextField
                    label="Odometer"
                    value={form.odometer}
                    onChange={(e) => setForm((prev) => ({ ...prev, odometer: e.target.value }))}
                    size="small"
                    type="number"
                    sx={{ maxWidth: 200, mt: 1 }}
                    inputProps={{ min: 0 }}
                  />
                </Stack>
              ) : null}

              {!customer ? (
                <Typography variant="body2" color="text.secondary">
                  Select a customer first to pick a vehicle.
                </Typography>
              ) : null}
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card sx={{ p: 3 }}>
            <Stack spacing={2}>
              <SectionHeader
                title="Items"
                actions={
                  <Button variant="contained" onClick={() => setItemDialogOpen(true)} disabled={!vehicle}>
                    Add item
                  </Button>
                }
              />

              {items.length ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell align="center">Delete</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Chip size="small" label={item.type} color={item.type === 'service' ? 'info' : 'default'} />
                        </TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell align="right">{item.qty}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell align="right">{formatCurrency(item.qty * item.unitPrice)}</TableCell>
                        <TableCell align="center">
                          <IconButton size="small" onClick={() => handleDeleteItem(item.id)}>
                            ×
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Add goods, services, or parts to build the job card.
                </Typography>
              )}
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={600}>
                Summary
              </Typography>

              <TextField
                select
                label="Payment method"
                value={form.paymentMethod}
                onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                size="small"
                sx={{ maxWidth: 260 }}
              >
                {PAYMENT_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.credit}
                    onChange={(e) => setForm((prev) => ({ ...prev, credit: e.target.checked }))}
                  />
                }
                label="Allow credit"
              />

              <TextField
                label="Notes"
                multiline
                minRows={3}
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />

              <TextField
                label="Tech note"
                multiline
                minRows={3}
                value={form.techNote}
                onChange={(e) => setForm((prev) => ({ ...prev, techNote: e.target.value }))}
              />

              <Stack spacing={1} alignItems="flex-end" sx={{ mt: 1 }}>
                <TotalRow label="Subtotal" value={totals.subtotal} />
                <TotalRow label="VAT" value={totals.vat} />
                <TotalRow label="Total" value={totals.total} strong />
              </Stack>
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Stack spacing={2} alignItems="flex-start" justifyContent="space-between" sx={{ height: '100%' }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>
                  Ready to save?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Make sure the customer, vehicle, and items look correct before saving.
                </Typography>
              </Box>

              <Button
                variant="contained"
                size="large"
                onClick={handleSave}
                disabled={!canSave}
              >
                {saving ? 'Saving…' : 'Save order'}
              </Button>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      <CustomerSelectDialog
        open={customerSelectOpen}
        onClose={() => setCustomerSelectOpen(false)}
        onSelect={(value) => {
          setCustomer(value)
          setVehicle(null)
          setCustomerSelectOpen(false)
        }}
      />

      <CustomerCreateDialog
        open={customerCreateOpen}
        onClose={() => setCustomerCreateOpen(false)}
        onCreate={(value) => {
          setCustomer(value)
          setVehicle(null)
          setCustomerCreateOpen(false)
        }}
      />

      <VehicleSelectDialog
        open={vehicleSelectOpen}
        onClose={() => setVehicleSelectOpen(false)}
        customerId={customer?.id || null}
        onSelect={(value) => {
          setVehicle(value)
          setVehicleSelectOpen(false)
        }}
      />

      <VehicleCreateDialog
        open={vehicleCreateOpen}
        onClose={() => setVehicleCreateOpen(false)}
        customerId={customer?.id || null}
        onCreate={(value) => {
          setVehicle(value)
          setVehicleCreateOpen(false)
        }}
      />

      <ItemPickerDialog
        open={itemDialogOpen}
        onClose={() => setItemDialogOpen(false)}
        onAdd={(value) => handleAddItem(value)}
      />
    </Stack>
  )
}

function SectionHeader({ title, actions }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography variant="h6" fontWeight={600}>
        {title}
      </Typography>
      {actions}
    </Stack>
  )
}

function TotalRow({ label, value, strong }) {
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant={strong ? 'h6' : 'body1'}
        fontWeight={strong ? 700 : 600}
      >
        {Number(value || 0).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </Typography>
    </Stack>
  )
}

function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  React.useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(handle)
  }, [value, delay])

  return debounced
}

function CustomerSelectDialog({ open, onClose, onSelect }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const debouncedQ = useDebouncedValue(q)

  React.useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)

    const load = async () => {
      try {
        const data = await Customers.list(debouncedQ ? { q: debouncedQ } : {})
        if (active) {
          setResults(data?.rows || [])
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [open, debouncedQ])

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Select customer</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          margin="dense"
          placeholder="Search by name or phone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        <Box sx={{ maxHeight: 320, overflowY: 'auto', mt: 1 }}>
          {loading ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              Loading…
            </Typography>
          ) : results.length ? (
            <List>
              {results.map((item) => (
                <ListItemButton key={item.id} onClick={() => onSelect(item)}>
                  <ListItemText
                    primary={item.name}
                    secondary={[item.phone, item.email].filter(Boolean).join(' · ')}
                  />
                </ListItemButton>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No customers found.
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

function CustomerCreateDialog({ open, onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  React.useEffect(() => {
    if (open) {
      setForm({ name: '', phone: '', email: '' })
      setError('')
    }
  }, [open])

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Name and phone are required')
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
      }
      const result = await Customers.create(payload)
      const customer = result?.customer
      if (customer) {
        onCreate(customer)
      } else {
        setError('Customer created but response missing data')
      }
    } catch (err) {
      setError(err.message || 'Failed to create customer')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>New customer</DialogTitle>
      <DialogContent dividers>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Name"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <TextField
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            required
          />
          <TextField
            label="Email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving}>
          {saving ? 'Saving…' : 'Save customer'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function VehicleSelectDialog({ open, onClose, onSelect, customerId }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const debouncedQ = useDebouncedValue(q)

  React.useEffect(() => {
    if (!open) return
    if (!customerId) {
      setResults([])
      return
    }

    let active = true
    setLoading(true)

    const load = async () => {
      try {
        const params = { customer_id: customerId }
        if (debouncedQ) params.q = debouncedQ
        const data = await Vehicles.list(params)
        if (active) setResults(data?.rows || [])
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [open, debouncedQ, customerId])

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Select vehicle</DialogTitle>
      <DialogContent>
        {!customerId ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            Select a customer first.
          </Typography>
        ) : (
          <>
            <TextField
              fullWidth
              margin="dense"
              placeholder="Search by plate or model"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
            <Box sx={{ maxHeight: 320, overflowY: 'auto', mt: 1 }}>
              {loading ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  Loading…
                </Typography>
              ) : results.length ? (
                <List>
                  {results.map((item) => (
                    <ListItemButton key={item.id} onClick={() => onSelect(item)}>
                      <ListItemText
                        primary={[item.brand, item.model].filter(Boolean).join(' ')}
                        secondary={`Plate: ${item.license_plate}`}
                      />
                    </ListItemButton>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  No vehicles found.
                </Typography>
              )}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

function VehicleCreateDialog({ open, onClose, onCreate, customerId }) {
  const [form, setForm] = useState({ brand: '', model: '', licensePlate: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  React.useEffect(() => {
    if (open) {
      setForm({ brand: '', model: '', licensePlate: '' })
      setError('')
    }
  }, [open])

  const handleSubmit = async () => {
    if (!customerId) {
      setError('Select a customer first')
      return
    }
    if (!form.licensePlate.trim()) {
      setError('License plate is required')
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload = {
        customerId,
        brand: form.brand.trim() || null,
        model: form.model.trim() || null,
        licensePlate: form.licensePlate.trim(),
      }
      const result = await Vehicles.create(payload)
      const vehicle = result?.vehicle
      if (vehicle) {
        onCreate(vehicle)
      } else {
        setError('Vehicle created but response missing data')
      }
    } catch (err) {
      setError(err.message || 'Failed to create vehicle')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>New vehicle</DialogTitle>
      <DialogContent dividers>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Brand"
            value={form.brand}
            onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))}
          />
          <TextField
            label="Model"
            value={form.model}
            onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
          />
          <TextField
            label="License plate"
            value={form.licensePlate}
            onChange={(e) => setForm((prev) => ({ ...prev, licensePlate: e.target.value }))}
            required
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving || !customerId}>
          {saving ? 'Saving…' : 'Save vehicle'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function ItemPickerDialog({ open, onClose, onAdd }) {
  const [tab, setTab] = useState('goods')
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [qty, setQty] = useState(1)
  const [unitPrice, setUnitPrice] = useState(0)

  const debouncedQ = useDebouncedValue(q)

  React.useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)

    const load = async () => {
      try {
        const params = {}
        if (debouncedQ) params.q = debouncedQ
        params.active = 1

        let data
        if (tab === 'goods') {
          data = await Goods.list(params)
        } else if (tab === 'services') {
          data = await Services.list(params)
        } else {
          data = await Parts.list(params)
        }
        if (active) {
          setResults(data?.rows || [])
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
  }, [open, tab, debouncedQ])

  React.useEffect(() => {
    if (!open) {
      setQ('')
      setSelected(null)
      setQty(1)
      setUnitPrice(0)
    }
  }, [open])

  const handlePick = (item) => {
    setSelected(item)
    const price = Number(item?.default_price ?? item?.defaultPrice ?? 0)
    setUnitPrice(Number(price.toFixed(2)))
  }

  const handleAdd = () => {
    if (!selected) return
    const qtyValue = Number(qty)
    const unitPriceValue = Number(unitPrice)
    if (!Number.isFinite(qtyValue) || qtyValue <= 0) return
    if (!Number.isFinite(unitPriceValue) || unitPriceValue < 0) return

    const unit = tab === 'services' ? 'job' : 'pcs'
    const type = tab === 'goods' ? 'goods' : tab === 'services' ? 'service' : 'part'

    onAdd({
      id: (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `item-${Date.now()}-${Math.random()}`,
      sourceId: selected.id,
      name: selected.name,
      qty: qtyValue,
      unitPrice: Number(unitPriceValue.toFixed(2)),
      unit,
      type,
    })
  }

  const dialogTitle = tab === 'goods' ? 'Goods' : tab === 'services' ? 'Services' : 'Parts'

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Add item</DialogTitle>
      <DialogContent dividers>
        <Tabs
          value={tab}
          onChange={(_, value) => {
            setTab(value)
            setSelected(null)
          }}
          sx={{ mb: 2 }}
        >
          <Tab label="Goods" value="goods" />
          <Tab label="Services" value="services" />
          <Tab label="Parts" value="parts" />
        </Tabs>

        <TextField
          fullWidth
          placeholder={`Search ${dialogTitle.toLowerCase()}`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          size="small"
        />

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={7}>
            <Box sx={{ maxHeight: 320, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              {loading ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  Loading…
                </Typography>
              ) : results.length ? (
                <List disablePadding>
                  {results.map((item) => (
                    <ListItemButton
                      key={item.id}
                      selected={selected?.id === item.id}
                      onClick={() => handlePick(item)}
                    >
                      <ListItemText
                        primary={item.name}
                        secondary={
                          tab === 'services'
                            ? `Default price: ${formatPrice(item.default_price)}`
                            : [item.sku, formatPrice(item.default_price)].filter(Boolean).join(' · ')
                        }
                      />
                    </ListItemButton>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                  No {dialogTitle.toLowerCase()} found.
                </Typography>
              )}
            </Box>
          </Grid>
          <Grid item xs={12} md={5}>
            {selected ? (
              <Stack spacing={2}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {selected.name}
                </Typography>
                <TextField
                  label="Quantity"
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  inputProps={{ min: 0.1, step: 0.1 }}
                />
                <TextField
                  label="Unit price"
                  type="number"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  inputProps={{ min: 0, step: 0.01 }}
                />
                <Typography variant="body2" color="text.secondary">
                  Line total: {formatPrice(Number(qty) * Number(unitPrice))}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button onClick={() => setSelected(null)}>Clear</Button>
                  <Button variant="contained" onClick={handleAdd}>
                    Add to order
                  </Button>
                </Stack>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Select an item to set quantity and price.
              </Typography>
            )}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

function formatPrice(value) {
  const num = Number(value || 0)
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
