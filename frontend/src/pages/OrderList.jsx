import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Orders } from '../lib/api'

export default function OrdersList(){
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [])

  async function load(){
    setLoading(true)
    try {
      const data = await Orders.list(q ? { q } : {})
      setRows(data.rows || [])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2>Orders</h2>
      <div style={{ display:'flex', gap:8, margin:'8px 0' }}>
        <input placeholder="Search order no / name / phone / plate" value={q} onChange={e=>setQ(e.target.value)} />
        <button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Search'}</button>
      </div>
      <table border="1" cellPadding="6" style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr>
            <th>No</th><th>Date</th><th>Customer</th><th>Phone</th><th>Vehicle</th><th>Plate</th><th>Items</th><th>Total</th><th>Status</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td>{r.order_no}</td>
              <td>{r.date}</td>
              <td>{r.customer_name}</td>
              <td>{r.phone}</td>
              <td>{r.brand} {r.model}</td>
              <td>{r.license_plate}</td>
              <td style={{ textAlign:'right' }}>{r.items}</td>
              <td style={{ textAlign:'right' }}>{Number(r.total).toFixed(2)}</td>
              <td>{r.status}</td>
              <td><Link to={`/order/${r.id}`}>View</Link></td>
            </tr>
          ))}
          {rows.length === 0 && !loading && (
            <tr><td colSpan="10" style={{ textAlign:'center', padding:16 }}>No data</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
