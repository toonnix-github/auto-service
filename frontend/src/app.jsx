import { Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Container, Button } from '@mui/material';
import OrdersList from './pages/OrderList'
import OrderDetail from './pages/OrderDetail'

export default function App() {
  return (
    <>
      <AppBar position="sticky" color="primary" elevation={3}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            🚗 Auto Service Dashboard
          </Typography>
          <Button color="inherit" component={Link} to="/order">
            Orders
          </Button>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4, mb: 4 }}>
        <Routes>
          <Route path="/order" element={<OrdersList />} />
          <Route path="/order/:id" element={<OrderDetail />} />
          <Route path="*" element={<OrdersList />} />
        </Routes>
      </Container>
    </>
  );
}