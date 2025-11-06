import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Orders } from '../lib/api'

export default function OrderDetail(){
  const { id } = useParams()
  const [data, setData] = useState(null)

  useEffect(() => { Orders.get(id).then(setData) }, [id])
  if(!data) return <div>Loading...</div>

  const { order, items } = data
  return (
    <div>
      <h2>Order {order.order_no}</h2>
      <p><b>Date:</b> {order.date}</p>
      <p><b>Customer:</b> {order.customer_name} ({order.phone})</p>
      <p><b>Vehicle:</b> {order.brand} {order.model} — {order.license_plate}</p>
      <p><b>Status:</b> {order.status}</p>

      <h3>Items</h3>
      <table border="1" cellPadding="6" style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr><th>No</th><th>Type</th><th>Name</th><th>Unit</th><th>Qty</th><th>Total</th></tr>
        </thead>
        <tbody>
          {items.map(it => (
            <tr key={it.id}>
              <td>{it.no}</td>
              <td>{it.type}</td>
              <td>{it.name_snapshot}</td>
              <td style={{ textAlign:'right' }}>{Number(it.unit_price).toFixed(2)}</td>
              <td style={{ textAlign:'right' }}>{it.qty}</td>
              <td style={{ textAlign:'right' }}>{Number(it.line_total).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Totals</h3>
      <p>Subtotal: {Number(order.subtotal).toFixed(2)} | VAT: {Number(order.vat).toFixed(2)} | Total: {Number(order.total).toFixed(2)}</p>

      <div style={{ marginTop:12 }}>
        <Link to="/order">← Back to list</Link>
      </div>
    </div>
  )
}
