import { Dialog, DialogTitle, DialogContent, TextField, Button, Box, IconButton} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export default function ContactDialog({ open, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      {/* Title with Close Button */}
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        Contact Us
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent>
        <Box
          component="form"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            mt: 1,
          }}
        >
          <TextField label="Your email" fullWidth />
          <TextField label="Message" multiline rows={3} fullWidth />

          {/* Black Send Button with White Font */}
          <Button
            variant="contained"
            type="submit"
            sx={{
              backgroundColor: 'black',
              color: 'white',
              '&:hover': {
                backgroundColor: '#333',
              },
              borderRadius: 2,
              py: 1,
            }}
          >
            Send
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
