import React from 'react'
import PropTypes from 'prop-types'
import { Button, Dialog, DialogContent, Stack } from '@mui/material'
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
              <Button
                variant="text"
                size="small"
                onClick={onClose}
              >
                Close
              </Button>
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
