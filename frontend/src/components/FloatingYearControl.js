import { Paper, Box, Typography, FormControl, Select, MenuItem } from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

export default function FloatingYearControl({ year, setYear }) {
  return (
    <Paper
      elevation={6}
      sx={{
        position: 'fixed',
        bottom: 30,
        left: 25,
        zIndex: 1300, // High z-index to float above everything
        p: 2,
        borderRadius: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        border: '1px solid #e0e0e0',
        animation: 'fadeIn 0.5s ease-in-out',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#1976d2' }}>
        <CalendarTodayIcon fontSize="small" />
        <Typography variant="subtitle2" fontWeight={700}>
          Global Year
        </Typography>
      </Box>

      <FormControl size="small" sx={{ minWidth: 100 }}>
        <Select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          sx={{ 
            bgcolor: 'white', 
            borderRadius: 2,
            fontWeight: 'bold',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1976d2' }
          }}
        >
          {[2023, 2024, 2025, 2026, 2027].map((y) => (
            <MenuItem key={y} value={y}>
              {y}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Paper>
  );
}