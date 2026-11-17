import {
  Typography,Grid,Card,CardMedia,TextField,MenuItem,Box,Dialog,DialogTitle,DialogContent,DialogActions,Button,
} from '@mui/material';
import { useEffect, useState } from 'react';

export default function RecommendedPlacesList({ city }) {
  const [places, setPlaces] = useState([]);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("az");

  // Popup States
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    import(`../../assets/location/${city}.json`)
      .then((module) => setPlaces(module.default))
      .catch((err) => console.error('Error loading city data:', err));
  }, [city]);

  const filteredPlaces = places
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === "az") return a.name.localeCompare(b.name);
      if (sortOrder === "za") return b.name.localeCompare(a.name);
      return 0;
    });

  // Open popup
  const handleOpen = (place) => {
    setSelectedPlace(place);
    setOpen(true);
  };

  // Close popup
  const handleClose = () => {
    setOpen(false);
    setSelectedPlace(null);
  };

  return (
    <div>
      <Typography
        variant="h6"
        fontWeight={700}
        sx={{ mb: 1, mt: 1 }}
      >
        Places to Visit in {city}
      </Typography>

      {/* Search + Sort Row */}
      <Box sx={{ display: "flex", gap: 2, mb: 1 }}>
        <TextField
          label="Search"
          variant="outlined"
          size="small"
          fullWidth
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            flex: 1,
            "& .MuiInputBase-root": { height: 30 },
            "& .MuiInputBase-input": { fontSize: "0.8rem", padding: "6px 8px" },
            "& .MuiInputLabel-root": { fontSize: "0.8rem", top: "-3px" }
          }}
        />

        <TextField
          label="Sort"
          variant="outlined"
          size="small"
          select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          sx={{
            width: "110px",
            "& .MuiInputBase-root": { height: 30 },
            "& .MuiInputBase-input": { fontSize: "0.8rem", padding: "6px 8px" },
            "& .MuiInputLabel-root": { fontSize: "0.8rem", top: "-3px" }
          }}
        >
          <MenuItem value="az">A → Z</MenuItem>
          <MenuItem value="za">Z → A</MenuItem>
        </TextField>
      </Box>

      {/* Scrollable List */}
      <div
        style={{
          height: "380px",
          overflowY: "auto",
          padding: "10px",
          backgroundColor: "#fff",
        }}
      >
        <Grid
          container
          spacing={3}
          direction="column"
          sx={{ alignItems: "center" }}  
        >
          {filteredPlaces.map((place, index) => (
            <Grid item key={index} sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
              <Card
                onClick={() => handleOpen(place)}
                sx={{
                  cursor: "pointer",
                  width: "100%",
                  maxWidth: 500,
                  borderRadius: 3,
                  display: "flex",
                  flexDirection: "row",
                  padding: 2,
                  boxShadow: "0 3px 12px rgba(0,0,0,0.12)",
                  borderLeft: "6px solid #00C4B3",
                  transition: "0.2s",
                  "&:hover": { transform: "translateY(-3px)" }
                }}
              >
                {/* LEFT: Text */}
                <Box sx={{ flex: 1, pr: 2 }}>
                  <Typography
                    variant="subtitle1"
                    fontWeight={700}
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <span style={{ fontSize: "18px" }}>📍</span> {place.name}
                  </Typography>

                  <Typography
                    variant="body2"
                    sx={{ mt: 1.5, fontSize: "12px", color: "#555", lineHeight: 1.4 }}
                  >
                    {place.description || "No description provided."}
                  </Typography>
                </Box>

                {/* RIGHT: Image */}
                <CardMedia
                  component="img"
                  image={require(`../../assets/location/${place.imagePath}`)}
                  alt={place.name}
                  sx={{
                    width: 120,
                    height: 100,
                    borderRadius: 2,
                    objectFit: "cover"
                  }}
                />
              </Card>
            </Grid>

          ))}
        </Grid>
      </div>
      {/* Popup Dialog  */}
      <Dialog open={open} onClose={handleClose} PaperProps={{sx: {
          width: { xs: '90vw', sm: '70vw', md: '50vw' }, // responsive width
          maxHeight: '80vh', // max height relative to viewport
          borderRadius: 2,   // optional rounded corners
          overflow: 'hidden'
        }
      }}>
        {selectedPlace && (
          <>
            <DialogTitle>{selectedPlace.name}</DialogTitle>
            <DialogContent dividers>
              <img
                src={require(`../../assets/location/${selectedPlace.imagePath}`)}
                alt={selectedPlace.name}
                style={{ width: "100%", 
                  height: 300,         // fixed height 
                  objectFit: 'cover',  // fill box, crop if needed
                  borderRadius: 2,
                  mb: 2, 
                  marginBottom: "16px" }}
              />

              {/* Add more details from JSON here */}
              <Typography variant="body1">
                📍 <b>Location:</b> {selectedPlace.location || "Not provided"}
              </Typography>

              <Typography variant="body2" sx={{ mt: 2 }}>
                {selectedPlace.description || "No description provided."}
              </Typography>
            </DialogContent>

            <DialogActions>
              <Button onClick={handleClose}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </div>
  );
}
