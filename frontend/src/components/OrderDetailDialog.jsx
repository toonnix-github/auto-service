import React from 'react'
import PropTypes from 'prop-types'
import { Dialog, DialogContent, IconButton, Stack } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import OrderDetailContent from './OrderDetailContent.jsx'

export default function OrderDetailDialog({ orderId, open, onClose, onStatusChange }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
    >
      <DialogContent sx={{ p: 0 }}>
        <OrderDetailContent
          orderId={orderId}
          onStatusChange={onStatusChange}
          headerActions={(
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton aria-label="Close order detail" onClick={onClose} size="small">
                <CloseIcon />
              </IconButton>
            </Stack>
          )}
          sx={{ p: { xs: 2, sm: 3 } }}
        />
      </DialogContent>
    </Dialog>
  )
}

OrderDetailDialog.propTypes = {
  orderId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onStatusChange: PropTypes.func,
}

OrderDetailDialog.defaultProps = {
  orderId: undefined,
  open: false,
  onClose: undefined,
  onStatusChange: undefined,
}
