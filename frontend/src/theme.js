import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: { main: '#1976d2' },  // blue
        secondary: { main: '#ff9800' }, // orange
        background: {
            default: '#f8f9fb',
            paper: '#ffffff',
        },
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontSize: '2rem', fontWeight: 600 },
        h2: { fontSize: '1.5rem', fontWeight: 500 },
    },
    shape: {
        borderRadius: 10,
    },
    components: {
        MuiCard: { styleOverrides: { root: { boxShadow: '0 4px 12px rgba(0,0,0,.08)', padding: '1rem' } } },
        MuiButton: { styleOverrides: { root: { textTransform: 'none', borderRadius: 8, fontWeight: 500 } } },
        MuiDataGrid: {
            styleOverrides: {
                root: { border: 'none', background: '#fff', borderRadius: 12 },
                columnHeaders: { background: '#f2f6ff', fontWeight: 600 },
                row: { '&:hover': { backgroundColor: '#fafcff' } },
            }
        }

    },
});

export default theme;
