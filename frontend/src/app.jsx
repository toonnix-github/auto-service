import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import OrdersList from './pages/OrderList'
import OrderDetail from './pages/OrderDetail'

export default function App(){
  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: '0 auto' }}>
      <header style={{ display:'flex', gap:12, marginBottom:16 }}>
        <Link to="/order">Orders</Link>
      </header>
      <Routes>
        <Route path="/order" element={<OrdersList/>} />
        <Route path="/order/:id" element={<OrderDetail/>} />
        <Route path="*" element={<OrdersList/>} />
      </Routes>
    </div>
  )
}
