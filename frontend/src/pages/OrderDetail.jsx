// frontend/src/pages/OrderDetail.jsx
import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '@mui/material'
import OrderDetailContent from '../components/OrderDetailContent.jsx'

export default function OrderDetail() {
  const { id } = useParams()

  return (
    <OrderDetailContent
      orderId={id}
      headerActions={<Button component={Link} to="/order" variant="outlined">← Back to list</Button>}
    />
  )
}
