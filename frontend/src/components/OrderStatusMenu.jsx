import React, { useState } from 'react'
import { Button, CircularProgress, Menu, MenuItem } from '@mui/material'
import { ORDER_STATUS_OPTIONS, getOrderStatusLabel } from '../lib/orderStatus.js'

export function OrderStatusMenu({
  status,
  onChange,
  disabled = false,
  loading = false,
  size = 'medium',
  fullWidth = false,
  variant = 'outlined',
}) {
  const [anchorEl, setAnchorEl] = useState(null)
  const open = Boolean(anchorEl)
  const label = getOrderStatusLabel(status) || 'Unknown'

  const handleButtonClick = (event) => {
    event.stopPropagation()
    if (disabled || loading) return
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleMenuClose = (event) => {
    if (event?.stopPropagation) {
      event.stopPropagation()
    }
    handleClose()
  }

  const handleSelect = (value) => (event) => {
    event.stopPropagation()
    handleClose()
    if (value !== status && typeof onChange === 'function') {
      onChange(value)
    }
  }

  const minWidth = size === 'small' ? 120 : 160

  return (
    <>
      <Button
        variant={variant}
        color="info"
        size={size}
        onClick={handleButtonClick}
        disabled={disabled || loading}
        sx={{
          textTransform: 'none',
          minWidth,
          ...(fullWidth ? { width: '100%' } : {}),
        }}
      >
        {loading ? <CircularProgress size={16} /> : label}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        MenuListProps={{ dense: size === 'small' }}
      >
        {ORDER_STATUS_OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            selected={option.value === status}
            onClick={handleSelect(option.value)}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
