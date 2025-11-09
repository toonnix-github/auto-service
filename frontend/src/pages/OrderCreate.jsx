import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  Divider,
  MenuItem,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import Autocomplete from '@mui/material/Autocomplete'
import CircularProgress from '@mui/material/CircularProgress'
import { Orders, Customers, Vehicles, Catalog, Mechanics } from '../lib/api'

const steps = ['Customer', 'Vehicle', 'Items', 'Review']
const ORDER_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'ready', label: 'Ready' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const ITEM_TYPE_LABEL = {
  goods: 'Goods',
  part: 'Part',
  service: 'Service',
}

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
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const roundCurrency = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100

export default function OrderCreate() {
  const navigate = useNavigate()

  const [activeStep, setActiveStep] = useState(0)
  const [globalError, setGlobalError] = useState('')
  const [saving, setSaving] = useState(false)

  const [customer, setCustomer] = useState(null)
  const [customerOptions, setCustomerOptions] = useState([])
  const [customerLoading, setCustomerLoading] = useState(false)
  const customerSearchRef = useRef(null)

  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [customerDialogError, setCustomerDialogError] = useState('')
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', email: '' })
  const [creatingCustomer, setCreatingCustomer] = useState(false)

  const [vehicle, setVehicle] = useState(null)
  const [vehicleOptions, setVehicleOptions] = useState([])
  const [vehicleLoading, setVehicleLoading] = useState(false)
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false)
  const [vehicleDialogError, setVehicleDialogError] = useState('')
  const [vehicleForm, setVehicleForm] = useState({ brand: '', model: '', licensePlate: '' })
  const [creatingVehicle, setCreatingVehicle] = useState(false)

  const [catalogItems, setCatalogItems] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState('')

  const [items, setItems] = useState([])
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [itemDialogError, setItemDialogError] = useState('')
  const [itemTypeFilter, setItemTypeFilter] = useState('')
  const [itemSearch, setItemSearch] = useState('')
  const [selectedCatalogItem, setSelectedCatalogItem] = useState(null)
  const [itemQty, setItemQty] = useState('1')

  const [mechanicOptions, setMechanicOptions] = useState([])
  const [mechanicLoading, setMechanicLoading] = useState(false)
  const [mechanicError, setMechanicError] = useState('')
  const [selectedMechanics, setSelectedMechanics] = useState([])
  const [mechanicLimitError, setMechanicLimitError] = useState('')

  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [odometer, setOdometer] = useState('')
  const [status, setStatus] = useState('open')
  const [vatRate, setVatRate] = useState(0.07)
  const [notes, setNotes] = useState('')

  const loadCustomers = useCallback(async (query = '') => {
    setCustomerLoading(true)
    try {
      const params = query ? { q: query } : {}
      const data = await Customers.list(params)
      setCustomerOptions(data?.rows ?? [])
    } catch (error) {
      setGlobalError((prev) => prev || error.message || 'Failed to load customers')
    } finally {
      setCustomerLoading(false)
    }
  }, [])

  useEffect(() => { loadCustomers() }, [loadCustomers])

  useEffect(() => () => {
    if (customerSearchRef.current) {
      clearTimeout(customerSearchRef.current)
    }
  }, [])

  const handleCustomerInputChange = useCallback((_, value, reason) => {
    if (reason === 'reset') return
    if (customerSearchRef.current) {
      clearTimeout(customerSearchRef.current)
    }
    customerSearchRef.current = setTimeout(() => {
      loadCustomers(value)
    }, 250)
  }, [loadCustomers])

  useEffect(() => {
    if (!customer?.id) {
      setVehicle(null)
      setVehicleOptions([])
      return
    }

    let active = true
    setVehicleLoading(true)
    Vehicles.list({ customer_id: customer.id })
      .then((data) => {
        if (!active) return
        const rows = data?.rows ?? []
        setVehicleOptions(rows)
        setVehicle((prev) => {
          if (!prev) return null
          return rows.find((row) => row.id === prev.id) || null
        })
      })
      .catch((error) => {
        if (!active) return
        setGlobalError((prev) => prev || error.message || 'Failed to load vehicles')
      })
      .finally(() => {
        if (active) setVehicleLoading(false)
      })

    return () => { active = false }
  }, [customer?.id])

  useEffect(() => {
    let active = true
    setCatalogLoading(true)
    Catalog.list({ active: true })
      .then((data) => {
        if (!active) return
        setCatalogItems(data?.rows ?? [])
        setCatalogError('')
      })
      .catch((error) => {
        if (!active) return
        setCatalogError(error.message || 'Failed to load catalog items')
      })
      .finally(() => {
        if (active) setCatalogLoading(false)
      })

    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    setMechanicLoading(true)
    Mechanics.list()
      .then((data) => {
        if (!active) return
        setMechanicOptions(data?.rows ?? [])
        setMechanicError('')
      })
      .catch((error) => {
        if (!active) return
        setMechanicError(error.message || 'Failed to load mechanics')
      })
      .finally(() => {
        if (active) setMechanicLoading(false)
      })

    return () => { active = false }
  }, [])

  useEffect(() => {
    setSelectedMechanics((prev) => {
      if (!prev.length) return prev
      if (!mechanicOptions.length) return []
      const optionMap = new Map(mechanicOptions.map((option) => [option.id, option]))
      const next = prev
        .map((item) => optionMap.get(item.id))
        .filter(Boolean)
      if (next.length !== prev.length) return next
      for (let index = 0; index < next.length; index += 1) {
        if (next[index].id !== prev[index].id) {
          return next
        }
      }
      return prev
    })
  }, [mechanicOptions])

  const filteredCatalog = useMemo(() => {
    const query = itemSearch.trim().toLowerCase()
    return catalogItems.filter((item) => {
      if (itemTypeFilter && item.item_type !== itemTypeFilter) return false
      if (!query) return true
      const haystacks = [item.name, item.source_code, item.brand, item.category]
      return haystacks.some((field) => (field || '').toLowerCase().includes(query))
    })
  }, [catalogItems, itemTypeFilter, itemSearch])

  const totals = useMemo(() => {
    const subtotal = roundCurrency(items.reduce((sum, item) => sum + item.price * item.qty, 0))
    const taxableSubtotal = roundCurrency(items.reduce((sum, item) => item.taxable ? sum + item.price * item.qty : sum, 0))
    const vat = roundCurrency(taxableSubtotal * vatRate)
    const total = roundCurrency(subtotal + vat)
    return { subtotal, vat, total }
  }, [items, vatRate])

  const handleNext = () => {
    setGlobalError('')
    if (activeStep === 0 && !customer) {
      setGlobalError('Select or create a customer to continue')
      return
    }
    if (activeStep === 1 && !vehicle) {
      setGlobalError('Select or create a vehicle to continue')
      return
    }
    if (activeStep === 2 && items.length === 0) {
      setGlobalError('Add at least one item to continue')
      return
    }
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1))
  }

  const handleBack = () => {
    setGlobalError('')
    setActiveStep((prev) => Math.max(prev - 1, 0))
  }

  const handleCreateCustomer = async () => {
    if (!customerForm.name.trim()) {
      setCustomerDialogError('Name is required')
      return
    }
    if (!customerForm.phone.trim()) {
      setCustomerDialogError('Phone is required')
      return
    }

    setCreatingCustomer(true)
    setCustomerDialogError('')
    try {
      const payload = {
        name: customerForm.name.trim(),
        phone: customerForm.phone.trim(),
        email: customerForm.email.trim() || null,
      }
      const result = await Customers.create(payload)
      const created = result?.customer
      if (created) {
        setCustomerOptions((prev) => [created, ...prev.filter((item) => item.id !== created.id)])
        setCustomer(created)
      }
      setCustomerDialogOpen(false)
      setCustomerForm({ name: '', phone: '', email: '' })
    } catch (error) {
      setCustomerDialogError(error.message || 'Failed to create customer')
    } finally {
      setCreatingCustomer(false)
    }
  }

  const handleCreateVehicle = async () => {
    if (!customer?.id) {
      setVehicleDialogError('Select a customer first')
      return
    }
    if (!vehicleForm.licensePlate.trim()) {
      setVehicleDialogError('License plate is required')
      return
    }

    setCreatingVehicle(true)
    setVehicleDialogError('')
    try {
      const payload = {
        customerId: customer.id,
        brand: vehicleForm.brand.trim() || null,
        model: vehicleForm.model.trim() || null,
        licensePlate: vehicleForm.licensePlate.trim(),
      }
      const result = await Vehicles.create(payload)
      const created = result?.vehicle
      if (created) {
        setVehicleOptions((prev) => [created, ...prev.filter((item) => item.id !== created.id)])
        setVehicle(created)
      }
      setVehicleDialogOpen(false)
      setVehicleForm({ brand: '', model: '', licensePlate: '' })
    } catch (error) {
      setVehicleDialogError(error.message || 'Failed to create vehicle')
    } finally {
      setCreatingVehicle(false)
    }
  }

  const handleAddItem = () => {
    if (!selectedCatalogItem) {
      setItemDialogError('Select an item to add')
      return
    }
    const quantity = Number(itemQty)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setItemDialogError('Quantity must be greater than zero')
      return
    }

    const price = Number(selectedCatalogItem.price)
    const key = `${selectedCatalogItem.item_type}:${selectedCatalogItem.item_id}`
    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.key === key)
      const nextItem = {
        key,
        itemId: selectedCatalogItem.item_id,
        sourceId: selectedCatalogItem.source_id,
        itemType: selectedCatalogItem.item_type,
        name: selectedCatalogItem.name,
        code: selectedCatalogItem.source_code,
        price: Number.isFinite(price) ? price : 0,
        taxable: Boolean(selectedCatalogItem.taxable),
        qty: quantity,
      }
      if (existingIndex >= 0) {
        const next = [...prev]
        next[existingIndex] = nextItem
        return next
      }
      return [...prev, nextItem]
    })
    setItemDialogOpen(false)
    setSelectedCatalogItem(null)
    setItemQty('1')
    setItemDialogError('')
  }

  const handleItemQtyChange = (key) => (event) => {
    const value = Number(event.target.value)
    if (!Number.isFinite(value) || value <= 0) return
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, qty: value } : item)))
  }

  const handleRemoveItem = (key) => {
    setItems((prev) => prev.filter((item) => item.key !== key))
  }

  const handleMechanicChange = useCallback((_, value) => {
    if (value.length > 5) {
      setMechanicLimitError('You can assign up to 5 mechanics')
      return
    }
    setMechanicLimitError('')
    setSelectedMechanics(value)
  }, [])

  const handleSubmit = async () => {
    setGlobalError('')
    if (!customer || !vehicle || !items.length) {
      setGlobalError('Please complete all steps before creating the order')
      return
    }
    if (!orderDate) {
      setGlobalError('Order date is required')
      return
    }

    const parsedOdometer = odometer === '' ? null : Number(odometer)
    if (parsedOdometer !== null && (!Number.isFinite(parsedOdometer) || parsedOdometer < 0)) {
      setGlobalError('Odometer must be a positive number')
      return
    }

    setSaving(true)
    try {
      const payload = {
        customerId: customer.id,
        vehicleId: vehicle.id,
        date: orderDate,
        status,
        vatRate,
        items: items.map((item) => ({
          type: item.itemType,
          sourceId: item.sourceId,
          qty: item.qty,
        })),
      }
      if (parsedOdometer !== null) payload.odometer = parsedOdometer
      if (notes.trim()) payload.notes = notes.trim()
      if (selectedMechanics.length) {
        payload.mechanics = selectedMechanics.map((mechanic) => mechanic.id)
      }

      const result = await Orders.create(payload)
      const created = result?.order
      if (created?.id) {
        navigate(`/order/${created.id}`)
        return
      }
      if (result?.id) {
        navigate(`/order/${result.id}`)
        return
      }
      navigate('/order')
    } catch (error) {
      setGlobalError(error.message || 'Failed to create order')
    } finally {
      setSaving(false)
    }
  }
  const renderItemsTable = (editable) => (
    <Card variant="outlined">
      {items.length ? (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Unit price</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Line total</TableCell>
              {editable ? <TableCell align="right">Actions</TableCell> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.key}>
                <TableCell>
                  <Stack spacing={0.5}>
                    <Typography fontWeight={600}>{item.name}</Typography>
                    {item.code ? (
                      <Typography variant="caption" color="text.secondary">
                        Code: {item.code}
                      </Typography>
                    ) : null}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    color={typeChipColor(item.itemType)}
                    label={ITEM_TYPE_LABEL[item.itemType] || item.itemType}
                  />
                </TableCell>
                <TableCell align="right">{formatCurrency(item.price)}</TableCell>
                <TableCell align="right">
                  {editable ? (
                    <TextField
                      value={item.qty}
                      onChange={handleItemQtyChange(item.key)}
                      type="number"
                      size="small"
                      inputProps={{ min: 0.1, step: 0.1 }}
                      sx={{ width: 90 }}
                    />
                  ) : (
                    Number(item.qty).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                  )}
                </TableCell>
                <TableCell align="right">{formatCurrency(item.price * item.qty)}</TableCell>
                {editable ? (
                  <TableCell align="right">
                    <Button color="error" size="small" onClick={() => handleRemoveItem(item.key)}>
                      Remove
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">No items added yet.</Typography>
        </Box>
      )}
    </Card>
  )

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Stack spacing={2}>
            <Typography variant="h6">Customer</Typography>
            <Autocomplete
              value={customer}
              options={customerOptions}
              onChange={(_, value) => setCustomer(value)}
              getOptionLabel={(option) => {
                if (!option) return ''
                const parts = [option.name]
                if (option.phone) parts.push(option.phone)
                return parts.filter(Boolean).join(' • ')
              }}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              loading={customerLoading}
              onInputChange={handleCustomerInputChange}
              filterOptions={(options) => options}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search customer"
                  placeholder="Type to search by name or phone"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {customerLoading ? <CircularProgress color="inherit" size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            {customer ? (
              <Card variant="outlined" sx={{ p: 2 }}>
                <Typography fontWeight={600}>{customer.name}</Typography>
                <Typography variant="body2">Phone: {customer.phone}</Typography>
                {customer.email ? (
                  <Typography variant="body2">Email: {customer.email}</Typography>
                ) : null}
              </Card>
            ) : null}
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => { setCustomerDialogError(''); setCustomerDialogOpen(true) }}>
                + New customer
              </Button>
            </Stack>
          </Stack>
        )
      case 1:
        return (
          <Stack spacing={2}>
            <Typography variant="h6">Vehicle</Typography>
            <Autocomplete
              value={vehicle}
              options={vehicleOptions}
              onChange={(_, value) => setVehicle(value)}
              getOptionLabel={(option) => {
                if (!option) return ''
                const vehicleName = [option.brand, option.model].filter(Boolean).join(' ')
                return [option.license_plate, vehicleName].filter(Boolean).join(' • ')
              }}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              loading={vehicleLoading}
              disabled={!customer}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={customer ? 'Select vehicle' : 'Select a customer first'}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {vehicleLoading ? <CircularProgress color="inherit" size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            {vehicle ? (
              <Card variant="outlined" sx={{ p: 2 }}>
                <Typography fontWeight={600}>{vehicle.license_plate}</Typography>
                <Typography variant="body2">
                  {[vehicle.brand, vehicle.model].filter(Boolean).join(' ')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Customer: {vehicle.customer_name}
                </Typography>
              </Card>
            ) : null}
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={() => { setVehicleDialogError(''); setVehicleDialogOpen(true) }}
                disabled={!customer}
              >
                + New vehicle
              </Button>
            </Stack>
          </Stack>
        )
      case 2:
        return (
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Items</Typography>
              <Button
                variant="outlined"
                onClick={() => {
                  setItemDialogError('')
                  setSelectedCatalogItem(null)
                  setItemQty('1')
                  setItemSearch('')
                  setItemDialogOpen(true)
                }}
              >
                + Add item
              </Button>
            </Stack>
            {catalogError ? <Alert severity="error">{catalogError}</Alert> : null}
            {renderItemsTable(true)}
            <Stack direction="row" spacing={4} justifyContent="flex-end">
              <SummaryValue label="Subtotal" value={totals.subtotal} />
              <SummaryValue label="VAT" value={totals.vat} />
              <SummaryValue label="Total" value={totals.total} strong />
            </Stack>
          </Stack>
        )
      case 3:
        return (
          <Stack spacing={3}>
            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">Customer</Typography>
              <Typography fontWeight={600}>{customer?.name}</Typography>
              <Typography variant="body2">{customer?.phone}</Typography>
              {customer?.email ? (
                <Typography variant="body2">{customer.email}</Typography>
              ) : null}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="text.secondary">Vehicle</Typography>
              <Typography fontWeight={600}>{vehicle?.license_plate}</Typography>
              <Typography variant="body2">
                {[vehicle?.brand, vehicle?.model].filter(Boolean).join(' ')}
              </Typography>
            </Card>
            <Card variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={2}>
                <Typography variant="subtitle2" color="text.secondary">Mechanics</Typography>
                {mechanicError ? <Alert severity="error">{mechanicError}</Alert> : null}
                <Autocomplete
                  multiple
                  options={mechanicOptions}
                  value={selectedMechanics}
                  onChange={handleMechanicChange}
                  getOptionLabel={(option) => option?.name || ''}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  loading={mechanicLoading}
                  filterSelectedOptions
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Assign mechanics"
                      placeholder="Select up to 5 mechanics"
                      error={Boolean(mechanicLimitError)}
                      helperText={mechanicLimitError || ''}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {mechanicLoading ? <CircularProgress color="inherit" size={18} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
                {selectedMechanics.length ? (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {selectedMechanics.map((mechanic) => (
                      <Chip key={mechanic.id} label={mechanic.name} />
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No mechanics assigned.
                  </Typography>
                )}
              </Stack>
            </Card>
            {renderItemsTable(false)}
            <Stack direction="row" spacing={4} justifyContent="flex-end">
              <SummaryValue label="Subtotal" value={totals.subtotal} />
              <SummaryValue label="VAT" value={totals.vat} />
              <SummaryValue label="Total" value={totals.total} strong />
            </Stack>
            <Card variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={2}>
                <TextField
                  label="Order date"
                  type="date"
                  value={orderDate}
                  onChange={(event) => setOrderDate(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: { xs: '100%', sm: 220 } }}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Odometer"
                    value={odometer}
                    onChange={(event) => setOdometer(event.target.value)}
                    type="number"
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: { xs: '100%', sm: 220 } }}
                  />
                  <TextField
                    select
                    label="Status"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    sx={{ width: { xs: '100%', sm: 220 } }}
                  >
                    {ORDER_STATUSES.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="VAT rate (%)"
                    type="number"
                    value={Number((vatRate * 100).toFixed(2))}
                    onChange={(event) => {
                      const raw = event.target.value
                      if (raw === '') {
                        setVatRate(0)
                        return
                      }
                      const numeric = Number(raw)
                      if (!Number.isFinite(numeric) || numeric < 0) return
                      setVatRate(numeric / 100)
                    }}
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: { xs: '100%', sm: 220 } }}
                  />
                </Stack>
                <TextField
                  label="Notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  multiline
                  minRows={3}
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
            </Card>
          </Stack>
        )
      default:
        return null
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" fontWeight={600}>New order</Typography>
        <Button component={Link} to="/order" variant="outlined">← Back to list</Button>
      </Stack>

      {globalError ? <Alert severity="error">{globalError}</Alert> : null}

      <Card sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {renderStepContent()}

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Button onClick={handleBack} disabled={activeStep === 0 || saving}>
              Back
            </Button>
            <Stack direction="row" spacing={1}>
              <Button component={Link} to="/order" disabled={saving}>
                Cancel
              </Button>
              {activeStep === steps.length - 1 ? (
                <Button variant="contained" onClick={handleSubmit} disabled={saving}>
                  {saving ? 'Creating…' : 'Create order'}
                </Button>
              ) : (
                <Button variant="contained" onClick={handleNext} disabled={saving}>
                  Next
                </Button>
              )}
            </Stack>
          </Stack>
        </Stack>
      </Card>

      <Dialog
        open={customerDialogOpen}
        onClose={() => { if (!creatingCustomer) setCustomerDialogOpen(false) }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>New customer</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {customerDialogError ? <Alert severity="error">{customerDialogError}</Alert> : null}
            <TextField
              label="Name"
              value={customerForm.name}
              onChange={(event) => setCustomerForm((prev) => ({ ...prev, name: event.target.value }))}
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Phone"
              value={customerForm.phone}
              onChange={(event) => setCustomerForm((prev) => ({ ...prev, phone: event.target.value }))}
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Email"
              value={customerForm.email}
              onChange={(event) => setCustomerForm((prev) => ({ ...prev, email: event.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomerDialogOpen(false)} disabled={creatingCustomer}>
            Cancel
          </Button>
          <Button onClick={handleCreateCustomer} disabled={creatingCustomer} variant="contained">
            {creatingCustomer ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={vehicleDialogOpen}
        onClose={() => { if (!creatingVehicle) setVehicleDialogOpen(false) }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>New vehicle</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {vehicleDialogError ? <Alert severity="error">{vehicleDialogError}</Alert> : null}
            {customer ? (
              <Alert severity="info">
                Vehicle will be linked to <strong>{customer.name}</strong>
              </Alert>
            ) : null}
            <TextField
              label="Brand"
              value={vehicleForm.brand}
              onChange={(event) => setVehicleForm((prev) => ({ ...prev, brand: event.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Model"
              value={vehicleForm.model}
              onChange={(event) => setVehicleForm((prev) => ({ ...prev, model: event.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="License plate"
              value={vehicleForm.licensePlate}
              onChange={(event) => setVehicleForm((prev) => ({ ...prev, licensePlate: event.target.value }))}
              required
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVehicleDialogOpen(false)} disabled={creatingVehicle}>
            Cancel
          </Button>
          <Button onClick={handleCreateVehicle} disabled={creatingVehicle} variant="contained">
            {creatingVehicle ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={itemDialogOpen}
        onClose={() => { if (!catalogLoading) setItemDialogOpen(false) }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add item</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {itemDialogError ? <Alert severity="error">{itemDialogError}</Alert> : null}
            <TextField
              select
              label="Type"
              value={itemTypeFilter}
              onChange={(event) => setItemTypeFilter(event.target.value)}
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem value="">All types</MenuItem>
              <MenuItem value="goods">Goods</MenuItem>
              <MenuItem value="part">Parts</MenuItem>
              <MenuItem value="service">Services</MenuItem>
            </TextField>
            <Autocomplete
              value={selectedCatalogItem}
              options={filteredCatalog}
              onChange={(_, value) => setSelectedCatalogItem(value)}
              inputValue={itemSearch}
              onInputChange={(_, value) => setItemSearch(value)}
              filterOptions={(options) => options}
              loading={catalogLoading}
              getOptionLabel={(option) => option?.name || ''}
              renderOption={(props, option) => (
                <li {...props} key={`${option.item_type}-${option.item_id}`}>
                  <Stack spacing={0.5} sx={{ width: '100%' }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontWeight={600}>{option.name}</Typography>
                      <Chip size="small" label={ITEM_TYPE_LABEL[option.item_type] || option.item_type} color={typeChipColor(option.item_type)} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {option.source_code ? `Code: ${option.source_code} • ` : ''}Price: {formatCurrency(option.price)}
                    </Typography>
                  </Stack>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search item"
                  placeholder="Search by name, brand, or code"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {catalogLoading ? <CircularProgress color="inherit" size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <TextField
              label="Quantity"
              value={itemQty}
              onChange={(event) => setItemQty(event.target.value)}
              type="number"
              inputProps={{ min: 0.1, step: 0.1 }}
              InputLabelProps={{ shrink: true }}
              sx={{ width: { xs: '100%', sm: 200 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddItem} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

function SummaryValue({ label, value, strong }) {
  return (
    <Stack alignItems="flex-end">
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant={strong ? 'h6' : 'body1'} fontWeight={strong ? 700 : 600}>
        {formatCurrency(value)}
      </Typography>
    </Stack>
  )
}
