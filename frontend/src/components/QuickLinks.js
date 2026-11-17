import { Button, Stack } from '@mui/material';

const links = [
  { label: 'Weather Overview', id: 'weather-overview' },
  { label: 'Tourist Highlights', id: 'tourist-highlights' },
  { label: 'Map View', id: 'map-view' },
  { label: 'Trend Insights', id: 'trend-insight' },
];

export default function QuickLinks() {
  // Smooth scroll to section
  const scrollTo = (id) => {
    const section = document.getElementById(id);
    if (section) section.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Stack
      direction="row"
      spacing={3}
      sx={{
        my: 4,
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 3,
      }}
    >
      {links.map(({ label, id }) => (
        <Button
          key={id}
          onClick={() => scrollTo(id)}
          variant="outlined"
          disableRipple
          sx={{
            color: 'black',
            borderColor: 'black',
            borderWidth: 2,
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            py: 1.2,
            boxShadow: '2px 2px 6px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease',
            backgroundColor: 'transparent',
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.05)',
              borderColor: '#333',
              transform: 'scale(1.05)',
              boxShadow: '4px 4px 12px rgba(0,0,0,0.15)',
            },
          }}
        >
          {label}
        </Button>
      ))}
    </Stack>
  );
}
