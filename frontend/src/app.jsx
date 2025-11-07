import { Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Container, Button, Stack } from '@mui/material';
import OrdersList from './pages/OrderList'
import OrderDetail from './pages/OrderDetail'
import OrderCreate from './pages/OrderCreate'
import VehicleList from './pages/VehicleList'
import VehicleDetail from './pages/VehicleDetail'
import CustomerList from './pages/CustomerList'
import CustomerDetail from './pages/CustomerDetail'
import CatalogPage from './pages/Catalog'
import MechanicList from './pages/MechanicList'

export default function App() {
  return (
    <>
      <AppBar position="sticky" color="primary" elevation={3}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            🚗 Auto Service Dashboard
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button color="inherit" component={Link} to="/order">
              Orders
            </Button>
            <Button color="inherit" component={Link} to="/vehicle">
              Vehicles
            </Button>
            <Button color="inherit" component={Link} to="/customer">
              Customers
            </Button>
            <Button color="inherit" component={Link} to="/catalog">
              Catalog
            </Button>
            <Button color="inherit" component={Link} to="/mechanic">
              Mechanics
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 4, mb: 4 }}>
        <Routes>
          <Route path="/order" element={<OrdersList />} />
          <Route path="/order/new" element={<OrderCreate />} />
          <Route path="/order/:id" element={<OrderDetail />} />
          <Route path="/vehicle" element={<VehicleList />} />
          <Route path="/vehicle/:id" element={<VehicleDetail />} />
          <Route path="/customer" element={<CustomerList />} />
          <Route path="/customer/:id" element={<CustomerDetail />} />
          <Route path="/catalog" element={<CatalogPage />} />
          <Route path="/mechanic" element={<MechanicList />} />
          <Route path="*" element={<OrdersList />} />
        </Routes>
      </Container>
    </>
  );
}